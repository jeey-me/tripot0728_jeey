import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Alert, BackHandler, ActivityIndicator, View, Text, StatusBar, LogBox } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import FamilyFeedScreen from './src/screens/FamilyFeedScreen';
import PhotoDetailScreen from './src/screens/PhotoDetailScreen';
import PostEditorScreen from './src/screens/PostEditorScreen';
import { Asset } from 'react-native-image-picker';

LogBox.ignoreLogs(['ViewPropTypes will be removed']);

const API_BASE_URL = 'http://192.168.101.48:8080';
const USER_ID = 'user_1752719078023_16myc6';

interface Comment { id: number; author_name: string; comment_text: string; created_at: string; }
interface Photo { id: number; uploaded_by: string; created_at: string; comments: Comment[]; }

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [isLoading, setIsLoading] = useState(false);
  const [familyFeedData, setFamilyFeedData] = useState({});
  const [currentPhotoDetail, setCurrentPhotoDetail] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);

  const fetchFamilyPhotos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/family/family-yard/photos?user_id_str=${USER_ID}`);
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setFamilyFeedData(result.photos_by_date || {});
      } else {
        Alert.alert('오류', '사진을 불러오는데 실패했습니다.');
        setFamilyFeedData({});
      }
    } catch (error) {
      Alert.alert('네트워크 오류', '서버에 연결할 수 없습니다.');
      setFamilyFeedData({});
    } finally {
      setIsLoading(false);
    }
  };

  const navigate = (screen: string) => {
    if (screen === 'FamilyFeed') {
      fetchFamilyPhotos();
    }
    setCurrentScreen(screen);
  };

  const openPhotoDetail = async (photo: Photo) => {
    if (!photo || !photo.id) {
      Alert.alert("오류", "사진 정보를 여는데 실패했습니다.");
      return;
    }

    try {
      const detailRes = await fetch(`${API_BASE_URL}/api/v1/family/family-yard/photo/${photo.id}/detail`);
      const detail = await detailRes.json();

      const commentsRes = await fetch(`${API_BASE_URL}/api/v1/family/family-yard/photo/${photo.id}/comments`);
      const comments = await commentsRes.json();

      const detailData = {
        uri: detail.file_url,
        uploader: detail.uploaded_by,
        date: detail.created_at,
        comments: comments,
        photoId: detail.id,
        userId: USER_ID,
        apiBaseUrl: API_BASE_URL,
        description: detail.description,
        mentions: detail.mentions,
        location: detail.location,
      };

      setCurrentPhotoDetail(detailData);
      setCurrentScreen('PhotoDetail');
    } catch (error) {
      console.error("🔴 상세 정보 불러오기 실패:", error);
      Alert.alert("오류", "사진 상세 정보를 불러오는 데 실패했습니다.");
    }
  };
  
  useEffect(() => {
    const handleBackButton = () => {
      if (currentScreen !== 'Home') {
        setCurrentScreen('Home');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => backHandler.remove();
  }, [currentScreen]);

  const renderScreen = () => {
    if (isLoading && !['FamilyFeed', 'Home'].includes(currentScreen)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>처리 중입니다...</Text>
        </View>
      );
    }

    switch (currentScreen) {
      case 'Home':
        return <HomeScreen 
                  navigation={{ navigateToFamilyFeed: () => navigate('FamilyFeed') }} 
                  userId={USER_ID}
                  apiBaseUrl={API_BASE_URL}
               />;
      case 'FamilyFeed':
        return <FamilyFeedScreen 
                  apiBaseUrl={API_BASE_URL} 
                  feedData={familyFeedData} 
                  isLoading={isLoading} 
                  navigation={{ 
                    openDetail: openPhotoDetail,
                    goBack: () => setCurrentScreen('Home'),
                    navigateToPhotoUpload: () => setCurrentScreen('PhotoUpload'),
                    setSelectedImages: setSelectedImages
                  }} 
                  onRefresh={fetchFamilyPhotos}
                />
      case 'PhotoUpload':
        return <PostEditorScreen
                  images={selectedImages}
                  onBack={() => {
                    fetchFamilyPhotos();
                    setCurrentScreen('FamilyFeed');
                  }}
                  onCancel={() => setCurrentScreen('FamilyFeed')}
               />;
      case 'PhotoDetail':
        if (!currentPhotoDetail) return null;
        return <PhotoDetailScreen route={{ params: currentPhotoDetail }} navigation={{ goBack: () => setCurrentScreen('FamilyFeed') }} />;
      default:
        return <HomeScreen navigation={{ navigateToFamilyFeed: () => navigate('FamilyFeed') }} userId={USER_ID} apiBaseUrl={API_BASE_URL} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 }
});

