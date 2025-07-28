// src/utils/permissions.ts
import { Platform, PermissionsAndroid } from 'react-native';

export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS에서는 Info.plist에 선언만 해두면 자동으로 권한 팝업이 뜹니다.
    return true;
  }

  try {
    if (Platform.Version >= 33) {
      // Android 13(API 33) 이상: READ_MEDIA_IMAGES 권한 요청
      const granted = await PermissionsAndroid.request(
        'android.permission.READ_MEDIA_IMAGES',
        {
          title: '사진 접근 권한',
          message: '갤러리에서 사진을 선택하려면 권한이 필요합니다.',
          buttonPositive: '허용',
          buttonNegative: '취소',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Android 12(API 32) 이하: READ_EXTERNAL_STORAGE 권한 요청
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: '저장소 접근 권한',
          message: '갤러리에서 사진을 선택하려면 권한이 필요합니다.',
          buttonPositive: '허용',
          buttonNegative: '취소',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn('권한 요청 실패', err);
    return false;
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '위치 접근 권한',
        message: '현재 위치를 사용하려면 권한이 필요합니다.',
        buttonPositive: '허용',
        buttonNegative: '취소',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('위치 권한 요청 실패', err);
    return false;
  }
}
