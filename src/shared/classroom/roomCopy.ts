import type { Locale } from '../activities/contract';

/** Shared room copy (errors, language policy, share panel). Game-specific room text lives in each game folder. */
export const roomCopy = {
  de: {
    policyTitle: 'Sprache im Spielraum', policySame: 'Eine Sprache für alle',
    policySameHelp: 'Alle sehen die Sprache, die du jetzt gewählt hast.',
    policyChoice: 'Teilnehmende wählen die Sprache selbst',
    policyChoiceHelp: 'Jede Person wählt ihre Oberflächensprache. Die Wahl bleibt nur auf diesem Gerät.',
    languageViewLabel: 'Sprache für deine Ansicht',
    shareTitle: 'Mit der Gruppe teilen', shareCode: 'Raumcode', shareLink: 'Beitrittslink',
    shareCopy: 'Link kopieren', shareCopied: 'Kopiert!',
    shareAlt: 'Alternativ: Website öffnen und den Raumcode eingeben.',
    roomPolicyMissing: 'Die Spracheinstellung des Raums konnte nicht geladen werden.',
    roomUnavailable: 'Raum nicht verfügbar oder Spiel bereits gestartet.',
    serverError: 'Verbindung fehlgeschlagen.', noResponse: 'Keine Antwort vom Spielserver.',
    joinFailed: 'Beitritt fehlgeschlagen.', createFailed: 'Raum konnte nicht erstellt werden.',
    actionFailed: 'Aktion fehlgeschlagen.',
  },
  en: {
    policyTitle: 'Room interface language', policySame: 'One language for everyone',
    policySameHelp: 'Everyone sees the language you have selected now.',
    policyChoice: 'Participants choose their own language',
    policyChoiceHelp: 'Each person chooses their interface language. The choice stays on this device only.',
    languageViewLabel: 'Language for your view',
    shareTitle: 'Share with the group', shareCode: 'Room code', shareLink: 'Join link',
    shareCopy: 'Copy link', shareCopied: 'Copied!',
    shareAlt: 'Or open the website and enter the room code.',
    roomPolicyMissing: "The room's language settings could not be loaded.",
    roomUnavailable: 'Room unavailable or the game has already started.',
    serverError: 'Connection failed.', noResponse: 'No response from the game server.',
    joinFailed: 'Could not join the room.', createFailed: 'Could not create the room.',
    actionFailed: 'Action failed.',
  },
  vi: {
    policyTitle: 'Ngôn ngữ giao diện của phòng', policySame: 'Một ngôn ngữ cho tất cả',
    policySameHelp: 'Mọi người sẽ thấy ngôn ngữ bạn đang chọn.',
    policyChoice: 'Người tham gia tự chọn ngôn ngữ',
    policyChoiceHelp: 'Mỗi người tự chọn ngôn ngữ giao diện. Lựa chọn chỉ được lưu trên thiết bị này.',
    languageViewLabel: 'Ngôn ngữ hiển thị của bạn',
    shareTitle: 'Chia sẻ với nhóm', shareCode: 'Mã phòng', shareLink: 'Liên kết tham gia',
    shareCopy: 'Sao chép liên kết', shareCopied: 'Đã sao chép!',
    shareAlt: 'Hoặc mở trang web và nhập mã phòng.',
    roomPolicyMissing: 'Không thể tải cài đặt ngôn ngữ của phòng.',
    roomUnavailable: 'Phòng không khả dụng hoặc trò chơi đã bắt đầu.',
    serverError: 'Kết nối thất bại.', noResponse: 'Không nhận được phản hồi từ máy chủ trò chơi.',
    joinFailed: 'Không thể vào phòng.', createFailed: 'Không thể tạo phòng.',
    actionFailed: 'Thao tác thất bại.',
  },
} as const;

export type RoomCopyKey = keyof typeof roomCopy.en;

export function roomText(locale: Locale, key: RoomCopyKey): string {
  return roomCopy[locale][key];
}
