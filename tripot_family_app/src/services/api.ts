import axios from 'axios';
import { Asset } from 'react-native-image-picker';

// ✅ 공통 인스턴스 설정
const API_BASE_URL = 'http://192.168.101.48:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ 가족마당 사진 리스트 조회
export const getFamilyPhotos = async (userIdStr: string) => {
  const response = await apiClient.get('/family/family-yard/photos', {
    params: { user_id_str: userIdStr },
  });
  return response.data;
};

// ✅ 사진 업로드
export const uploadFamilyPhotos = async (
  userId: string,
  uploadedBy: string,
  assets: Asset[],
  description: string,
  mentions: string[],
  location: string | null,
  audioMessage: string
) => {
  const formData = new FormData();

  for (const asset of assets) {
    formData.append('files', {
      uri: asset.uri!,
      type: asset.type || 'image/jpeg',
      name: asset.fileName || `image_${Date.now()}.jpg`,
    } as any);
  }

  formData.append('user_id_str', userId);
  formData.append('uploaded_by', uploadedBy);
  formData.append('description', description);
  formData.append('mentions', mentions.join(',')); // 서버가 배열 기대 시 수정
  formData.append('location', location || '');
  formData.append('audio_message', audioMessage);

  const response = await axios.post(
    `${API_BASE_URL}/family/family-yard/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  console.log('📦 업로드 응답:', response.data);
  return response.data;
};

// ✅ 게시글 생성
export const createPost = async (
  photoId: number,
  userId: string,
  description: string,
  mentions: string[],
  location: string | null,
  audioMessage: string
) => {
  const payload = {
    photo_id: photoId,
    user_id_str: userId,
    description,
    mentions: mentions.join(','), // 서버가 배열 기대 시 수정
    location,
    audio_message: audioMessage,
  };

  try {
    const response = await apiClient.post('/family/family-yard/create-post', payload);
    console.log('📦 게시물 등록 응답:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('게시물 저장 실패:', error.response?.data || error.message);
    throw new Error('게시물 저장 실패');
  }
};

// ✅ 사진 상세 정보 조회
export const getPhotoDetail = async (photoId: number) => {
    const url = `/family/family-yard/photo/${photoId}`;
    console.log('📡 호출 주소:', `${API_BASE_URL}${url}`);

  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error: any) {
    console.error('❌ 사진 상세 조회 실패:', error.response?.data || error.message);
    throw new Error('사진 상세 정보 조회 실패');
  }
};

// ✅ 사진에 달린 댓글 리스트 조회
export const getCommentsForPhoto = async (photoId: number | string) => {
  try {
    const response = await apiClient.get(`/family/family-yard/photo/${photoId}/comments`);
    console.log('📦 댓글 응답:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('댓글 조회 실패:', error.response?.data || error.message);
    return []; // 서버 없을 경우 빈 배열 반환
  }
};

export const getFamilyFeed = async (userIdStr: string) => {
  const response = await axios.get(`${API_BASE_URL}/family/family-yard/feed`, {
    params: { user_id_str: userIdStr },
  });

  // 날짜별로 그룹핑 (예: '2025-07-23': [...])
  const grouped = response.data.reduce((acc: any, item: any) => {
    const date = item.created_at.split(' ')[0]; // 날짜만 추출
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return grouped;
};