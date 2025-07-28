import React, { useState, useEffect, useRef } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PanResponder,
  GestureResponderEvent,
} from 'react-native'
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service'
import {
  requestGalleryPermission,
  requestLocationPermission,
} from '../utils/permissions'
import { uploadFamilyPhotos } from '../services/api'

const MOCK_FAMILY = ['엄마', '아빠', '형', '동생', '할머니', '할아버지']
const MY_LABEL = '내 위치'
const SWIPE_THRESHOLD = 100

type Props = {
  images: Asset[]
  onBack: () => void
  onCancel: () => void
  onShare?: (data: {
    images: Asset[]
    description: string
    mentions: string[]
    location: string | null
    audioMessage: string
  }) => void
}

export default function PostEditorScreen({
  images,
  onBack,
  onCancel,
  onShare,
}: Props) {
  const [currentImages, setCurrentImages] = useState<Asset[]>(images)
  const [description, setDescription] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [audioMessage, setAudioMessage] = useState('')

  const [photoLocation, setPhotoLocation] = useState<string | null>(null)
  const [myLocation, setMyLocation] = useState<string | null>(null)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_: GestureResponderEvent, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dy) < 20,
      onPanResponderRelease: (_: GestureResponderEvent, g) => {
        if (g.dx > SWIPE_THRESHOLD) onBack()
      },
    })
  ).current

  useEffect(() => {
    const first = currentImages[0]
    if (first?.latitude != null && first?.longitude != null) {
      setPhotoLocation(
        `${first.latitude.toFixed(5)}, ${first.longitude.toFixed(5)}`
      )
    }
  }, [currentImages])

  useEffect(() => {
    ;(async () => {
      const ok1 = await requestGalleryPermission()
      const ok2 = await requestLocationPermission()
      if (!ok1 || !ok2) return

      Geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords
          setMyLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        },
        err => Alert.alert('위치 오류', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      )
    })()
  }, [])

  const pickMore = async () => {
    const ok = await requestGalleryPermission()
    if (!ok) return

    launchImageLibrary(
      { selectionLimit: 0, mediaType: 'photo' },
      resp => {
        if (resp.didCancel) return
        if (resp.errorCode) {
          Alert.alert('오류', resp.errorMessage ?? '알 수 없는 에러')
          return
        }
        if (resp.assets) {
          setCurrentImages([...currentImages, ...resp.assets])
        }
      }
    )
  }

  const toggleMention = (name: string) => {
    setMentions(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  const handleShare = async () => {
    if (currentImages.length === 0) return

    try {
      // 사진 + 게시글 정보 한 번에 업로드
      const uploadResult = await uploadFamilyPhotos(
        'user_1752719078023_16myc6', // 실제 user_id_str
        'family',
        currentImages,
        description,
        mentions,
        selectedLocation ?? '',
        audioMessage
      )
      console.log('📦 업로드 응답:', uploadResult)

      if (!uploadResult || !uploadResult.status || uploadResult.status !== 'success') {
        Alert.alert('업로드 오류', '업로드 결과가 이상합니다.')
        return
      }

      Alert.alert('성공', '사진과 게시물이 업로드되었습니다!')
      onBack()
    } catch (error) {
      console.error('🔴 업로드 중 오류:', error)
      Alert.alert('실패', '업로드 중 오류가 발생했습니다.')
    }
  }

  const locationOptions = [
    photoLocation && { label: photoLocation, value: photoLocation },
    myLocation && { label: MY_LABEL, value: myLocation },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <SafeAreaView style={s.container} {...panResponder.panHandlers}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>새 게시물 업로드</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={s.cancelText}>취소</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {currentImages.map((img, i) => (
              <Image
                key={i}
                source={{ uri: img.uri }}
                style={s.previewImage}
              />
            ))}

            <TouchableOpacity style={s.plusSlot} onPress={pickMore}>
              <Text style={s.plusText}>✚</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={s.section}>
            <Text style={s.label}>설명</Text>
            <TextInput
              style={s.textArea}
              placeholder="사진에 대한 설명을 입력하세요."
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={s.section}>
            <Text style={s.label}>다른 가족 언급하기</Text>
            <View style={s.tagContainer}>
              {MOCK_FAMILY.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[s.tag, mentions.includes(name) && s.tagSelected]}
                  onPress={() => toggleMention(name)}
                >
                  <Text
                    style={[s.tagText, mentions.includes(name) && s.tagTextSelected]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.label}>위치 추가</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {locationOptions.map(({ label, value }, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.tag, selectedLocation === value && s.tagSelected]}
                  onPress={() => setSelectedLocation(value)}
                >
                  <Text
                    style={[s.tagText, selectedLocation === value && s.tagTextSelected]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.section}>
            <Text style={s.label}>어르신께 음성 업로드 알림 보내기</Text>
            <TextInput
              style={s.textInput}
              placeholder="알림용 음성메시지를 입력하세요."
              value={audioMessage}
              onChangeText={setAudioMessage}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity style={s.shareButton} onPress={handleShare}>
        <Text style={s.shareText}>공유하기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  backText: { fontSize: 18, color: '#ff7b00' },
  cancelText: { fontSize: 16, color: '#888' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 12, paddingBottom: 80 },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  plusSlot: {
    width: 100,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: { fontSize: 32, color: '#ff7b00' },
  section: { marginTop: 16 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlignVertical: 'top',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: { backgroundColor: '#ffecd5', borderColor: '#ff7b00' },
  tagText: { fontSize: 14, color: '#555' },
  tagTextSelected: { color: '#ff7b00', fontWeight: '600' },
  shareButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff7b00',
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareText: { color: '#fff', fontSize: 18, fontWeight: '600' },
})