
import { Asset } from 'react-native-image-picker'

export interface Post {
  id: string
  timestamp: number
  description: string
  mentions: string[]
  location: string | null
  audioMessage: string
  images: Asset[]
}
