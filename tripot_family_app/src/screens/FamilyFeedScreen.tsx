import React, { useEffect, useState } from 'react';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import {
  SafeAreaView,
  SectionList,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { requestGalleryPermission } from '../utils/permissions';


function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

interface FamilyFeedScreenProps {
  apiBaseUrl: string;
  feedData: Record<string, any[]>;
  navigation: any;
  onRefresh: () => void;
  userId: string;
}


const FamilyFeedScreen: React.FC<FamilyFeedScreenProps> = ({
  apiBaseUrl,
  feedData,
  navigation,  
  onRefresh,
  userId,
}) => {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const grouped = feedData || {};
    const normalized = Object.entries(grouped).map(([date, photos]) => ({
      title: date,
      data: chunkArray(photos, 2), // 사진 2개씩 묶기
    }));
    setSections(normalized);
  }, [feedData]);

  // navigation에 openDetail 함수가 없으면 추가
  if (!navigation.openDetail) {
    navigation.openDetail = (photo: any) => {
      navigation.navigate('PhotoDetail', {
        photoId: photo.id,
        uri: photo.file_url,
        uploader: photo.uploaded_by,
        date: photo.created_at,
        userId,
        apiBaseUrl,
      });
    };
  }

  const renderRow  = ({ item: photoRow }: any) => {
    if (!Array.isArray(photoRow)) return null;

    return (
      <View style={styles.row}>
        {photoRow.map((photo: any) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.postCard}
            onPress={() => navigation.openDetail(photo)}
          >
            <Image
              source={{ uri: encodeURI(`${apiBaseUrl}${photo.file_url}`) }}
              style={styles.postImage}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  
  const handleImagePicker = async () => {
    try {
      // 1. 권한 체크
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      // 2. 이미지 피커 호출
      launchImageLibrary(
        {
          mediaType: 'photo',
          selectionLimit: 0,
          quality: 0.8,
        },
        (resp) => {
          console.log('📸 이미지 피커 응답:', resp);

          if (resp.didCancel) {
            console.log('사용자가 취소함');
            return;
          }

          if (resp.errorCode) {
            console.error('이미지 피커 오류:', resp.errorMessage);
            Alert.alert('오류', resp.errorMessage || '이미지를 선택할 수 없습니다.');
            return;
          }

          if (resp.assets && resp.assets.length > 0) {
            console.log('✅ 선택된 이미지 개수:', resp.assets.length);
            navigation.setSelectedImages(resp.assets as Asset[]);
            navigation.navigateToPhotoUpload();
          } else {
            Alert.alert('알림', '선택된 이미지가 없습니다.');
          }
        }
      );
    } catch (error) {
      console.error('🔴 이미지 피커 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  return (   

    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <ActivityIndicator size="large" color="#ff7b00" style={{ marginTop: 20 }} />
      ) : (

      <SectionList
        sections={sections}
        // keyExtractor={(item, index) => `${index}`}
        keyExtractor={(item, index) =>
          Array.isArray(item)
            ? item.map((p) => p.id).join('-')
            : `${index}`
        }
        renderItem={renderRow }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
        onRefresh={onRefresh}
        refreshing={loading}
      />

        )}

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleImagePicker}
        >
          <Text style={styles.galleryIcon}>✏️</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginLeft: 16,
    color: '#444',
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    marginTop: 10,
  },
  postCard: {
    //  flex: 1, marginHorizontal: 4 
      flexBasis: '48%',
      margin: 2,
    },
  postImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#ff7b00',
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  galleryIcon: { fontSize: 28, color: 'white' },
});


export default FamilyFeedScreen;
