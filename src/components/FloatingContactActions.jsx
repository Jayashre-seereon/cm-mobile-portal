import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../app-state';
import { palette } from '../careermap-data';
import api from '../api/axios';

const CONTACT_PHONE = '+919776808179';

export default function FloatingContactActions() {
  const { preferences } = useAppState();
  const [open, setOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const dark = preferences.darkMode;

  const submitMessage = async () => {
    const message = messageText.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await api.post('/send-message', { message });
      setMessageText('');
      setOpen(false);
      Alert.alert('Message sent', 'Your message has been sent to CareerMap.');
    } catch (error) {
      Alert.alert('Could not send message', error?.response?.data?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return <>
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 10, top: '43%', zIndex: 1000, gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Call CareerMap" onPress={() => Linking.openURL(`tel:${CONTACT_PHONE}`)} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary, elevation: 5 }}><Ionicons name="call" size={21} color="#fff" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="WhatsApp CareerMap" onPress={() => Linking.openURL(`https://wa.me/${CONTACT_PHONE.replace(/\D/g, '')}`)} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', elevation: 5 }}><Ionicons name="logo-whatsapp" size={25} color="#fff" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Send a message" onPress={() => setOpen(true)} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#171717' : '#fff', borderWidth: 1, borderColor: '#eadbd7', elevation: 5 }}><Ionicons name="chatbubble-ellipses" size={21} color={palette.primary} /></Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ borderRadius: 18, padding: 20, backgroundColor: dark ? '#111' : '#fff' }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: dark ? '#fff' : palette.text, marginBottom: 8 }}>Send us a message</Text>
          <Text style={{ fontSize: 13, color: dark ? '#bbb' : '#776b67', marginBottom: 14 }}>Your account name, email, and phone will be included.</Text>
          <TextInput multiline value={messageText} onChangeText={setMessageText} maxLength={5000} placeholder="Write your message" placeholderTextColor={dark ? '#777' : '#a89a94'} textAlignVertical="top" style={{ minHeight: 120, borderWidth: 1, borderColor: '#ddc9c4', borderRadius: 12, padding: 12, color: dark ? '#fff' : palette.text }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <Pressable onPress={() => setOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 10 }}><Text style={{ color: palette.primary, fontWeight: '700' }}>Cancel</Text></Pressable>
            <Pressable disabled={!messageText.trim() || sending} onPress={submitMessage} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: !messageText.trim() || sending ? '#c9918b' : palette.primary }}><Text style={{ color: '#fff', fontWeight: '700' }}>{sending ? 'Sending...' : 'Send message'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}
