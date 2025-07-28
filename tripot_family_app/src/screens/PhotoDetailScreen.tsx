import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

interface PhotoDetailScreenProps {
  route: {
    params: {
      photoId: string;
      uri: string;
      uploader: string;
      date: string;
      userId: string;
      apiBaseUrl: string;
    };
  };
  navigation: any;
}

interface PhotoDetail {
  id: string;
  description: string;
  mentions: string[];
  location: string;
  audio_message: string;
  uploaded_by: string;
  created_at: string;
}

interface Comment {
  id: string;
  author_name: string;
  comment_text: string;
  created_at: string;
}

const PhotoDetailScreen: React.FC<PhotoDetailScreenProps> = ({ route, navigation }) => {
  const { photoId, uri, uploader, date, userId, apiBaseUrl } = route.params;
  
  const [photoDetail, setPhotoDetail] = useState<PhotoDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPhotoDetail();
    fetchComments();
  }, []);

  const fetchPhotoDetail = async () => {
    try {
      // const response = await fetch(`${apiBaseUrl}/api/posts/${photoId}`);
      const response = await fetch(`${apiBaseUrl}/api/v1/family/family-yard/photo/${photoId}/detail`);
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        setPhotoDetail(data.data);
      }
    } catch (error) {
      console.error('사진 상세 정보 로드 실패:', error);
      Alert.alert('오류', '사진 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      // const response = await fetch(`${apiBaseUrl}/api/photo_comments/${photoId}`);
      const response = await fetch(`${apiBaseUrl}/api/v1/family/family-yard/photo/${photoId}/comments`);
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('알림', '댓글을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/photo_comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_id: photoId,
          user_id: userId,
          comment_text: newComment.trim(),
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setNewComment('');
        fetchComments(); // 댓글 목록 새로고침
        Alert.alert('성공', '댓글이 등록되었습니다.');
      } else {
        Alert.alert('오류', '댓글 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 등록 실패:', error);
      Alert.alert('오류', '댓글 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>사진 상세</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7b00" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }
  // 상세페이지 이미지 표시를 위해 추가함
  // const fullImageUrl = `${apiBaseUrl.replace(/\/$/, '')}${uri}`;
  const fullImageUrl = uri.startsWith('http') ? uri : encodeURI(`${apiBaseUrl}${uri}`);

  console.log('✅ fullImageUrl:', fullImageUrl);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사진 상세</Text>
        <View style={{ width: 30 }} />
      </View>


      <ScrollView style={styles.content}>
        {/* 사진 */}
        {/* <Image source={{ uri }} style={styles.mainImage} /> */}
        <Image source={{ uri: fullImageUrl }} style={styles.mainImage} />

        {/* 게시자 및 날짜 */}
        <View style={styles.infoSection}>
          <Text style={styles.uploader}>{photoDetail?.uploaded_by || uploader}</Text>
          <Text style={styles.date}>{formatDate(photoDetail?.created_at || date)}</Text>
        </View>

        {/* 설명 */}
        {photoDetail?.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>설명</Text>
            <Text style={styles.description}>{photoDetail.description}</Text>
          </View>
        )}

        {/* 태그된 가족 */}
        {photoDetail?.mentions && photoDetail.mentions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>태그된 가족</Text>
            <View style={styles.tagContainer}>
              {photoDetail.mentions.map((mention, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{mention}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 위치 */}
        {photoDetail?.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>위치</Text>
            <Text style={styles.location}>📍 {photoDetail.location}</Text>
          </View>
        )}

        {/* 음성 메시지 */}
        {photoDetail?.audio_message && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>음성 메시지</Text>
            <View style={styles.audioContainer}>
              <Text style={styles.audioIcon}>🎵</Text>
              <Text style={styles.audioMessage}>{photoDetail.audio_message}</Text>
            </View>
          </View>
        )}

        {/* 댓글 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>댓글 ({comments.length})</Text>
          
          {/* 댓글 입력 */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={submitComment}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? '등록 중...' : '등록'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 댓글 목록 */}
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Text style={styles.commentAuthor}>{comment.author_name}</Text>
              <Text style={styles.commentText}>{comment.comment_text}</Text>
              <Text style={styles.commentDate}>
                {formatDate(comment.created_at)}
              </Text>
            </View>
          ))}

          {comments.length === 0 && (
            <Text style={styles.noComments}>아직 댓글이 없습니다.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 24,
    color: '#ff7b00',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  uploader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#ffecd5',
    borderColor: '#ff7b00',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#ff7b00',
    fontSize: 14,
    fontWeight: '600',
  },
  location: {
    fontSize: 16,
    color: '#333',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  audioIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  audioMessage: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  commentInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ff7b00',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
});

export default PhotoDetailScreen;