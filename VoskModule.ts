import { NativeModules } from 'react-native';
const { Kaldi } = NativeModules
interface VoskInterface {
   initialize(): Promise<String>;
   startListening(): void;
   stopListening(): void;
   destroy(): void;
}
export default Kaldi as VoskInterface;