import type { Locale } from '../../shared/activities/contract';

/** Memory online-room copy. Shared room errors and the language policy live in shared/classroom/roomCopy.ts. */
export const memoryRoomCopy = {
  de: {
    backToGame: '← Memory-Spiel', eyebrow: 'GEMEINSAM SPIELEN',
    joinTitle: 'Raum beitreten', joinIntro: 'Raumcode und Namen eingeben. Danach wartest du auf den Spielstart.',
    roomCodeLabel: 'Raumcode', nameLabel: 'Dein Name', joinSubmit: 'Raum beitreten', joining: 'Verbinde …',
    invalidCode: 'Bitte gib einen 6-stelligen Raumcode ein.',
    noAccessTitle: 'Kein Spielzugang gespeichert',
    noAccessHint: 'Bitte über deinen Raumcode beitreten. Der Gastgeber muss den Raum gegebenenfalls erneut öffnen.',
    connecting: 'Verbinde mit Raum {code} …', retry: 'Erneut versuchen',
    lobbyHost: 'Dein Spielraum', lobbyStudent: 'Warten auf den Start …', roomLabel: 'Raum',
    participants: 'Teilnehmende ({n})', noPlayers: 'Noch niemand beigetreten.',
    startGame: 'Spiel starten', teacherStarts: 'Die Lehrkraft startet das Spiel, sobald alle da sind.',
    leaveRoom: 'Raum verlassen', leaveGame: 'Spiel verlassen',
    pairsFound: 'Paare gefunden: {found} / {total}', pickFirst: 'Wähle die erste Karte.',
    pickSecond: 'Wähle die zweite Karte.', waitResolve: 'Die Karten bleiben kurz sichtbar.',
    correct: 'Richtig! Ein Paar gefunden!', wrong: 'Das passt leider nicht!',
    continueRound: 'Auflösung fortsetzen', skipTurn: 'Zug überspringen',
    resultsEyebrow: 'GESCHAFFT', resultsTitle: 'Spiel beendet!', wins: '{name} gewinnt!',
    tie: 'Gleichstand: {names}', points: '{score} Punkte', newGame: 'Neues Spiel',
    hidden: 'Verdeckte Karte', revealed: 'Aufgedeckte Karte', foundBy: 'gefunden von {name}',
    turnEyebrow: 'AKTUELLER ZUG', yourTurn: 'Du bist dran!', turnOf: '{name} ist an der Reihe',
    waitingTurn: 'Warte auf den Zug',
    createTitle: 'Online-Raum erstellen',
    createLead: 'Der Raum startet in der Sprache, die du gerade gewählt hast: {language}.',
    cancel: 'Abbrechen', createConfirm: 'Raum erstellen', creating: 'Raum wird erstellt …',
  },
  en: {
    backToGame: '← Memory game', eyebrow: 'PLAY TOGETHER',
    joinTitle: 'Join room', joinIntro: 'Enter the room code and your name. Then wait for the game to start.',
    roomCodeLabel: 'Room code', nameLabel: 'Your name', joinSubmit: 'Join room', joining: 'Connecting …',
    invalidCode: 'Enter a six-character room code.',
    noAccessTitle: 'No room access saved',
    noAccessHint: 'Join with the room code. The host may need to reopen the room.',
    connecting: 'Connecting to room {code} …', retry: 'Try again',
    lobbyHost: 'Your game room', lobbyStudent: 'Waiting for the game to start …', roomLabel: 'Room',
    participants: 'Players ({n})', noPlayers: 'Nobody has joined yet.',
    startGame: 'Start game', teacherStarts: 'The teacher starts the game once everyone is here.',
    leaveRoom: 'Leave room', leaveGame: 'Leave game',
    pairsFound: 'Pairs found: {found} / {total}', pickFirst: 'Choose the first card.',
    pickSecond: 'Choose the second card.', waitResolve: 'The cards stay visible for a moment.',
    correct: 'Correct! You found a pair!', wrong: 'Sorry, those do not match!',
    continueRound: 'Continue', skipTurn: 'Skip turn',
    resultsEyebrow: 'WELL DONE', resultsTitle: 'Game over!', wins: '{name} wins!',
    tie: 'Tie: {names}', points: '{score} points', newGame: 'New game',
    hidden: 'Face-down card', revealed: 'Face-up card', foundBy: 'found by {name}',
    turnEyebrow: 'CURRENT TURN', yourTurn: 'Your turn!', turnOf: "It's {name}'s turn",
    waitingTurn: 'Waiting for the next turn',
    createTitle: 'Create online room',
    createLead: 'The room starts in the language you have selected now: {language}.',
    cancel: 'Cancel', createConfirm: 'Create room', creating: 'Creating room …',
  },
  vi: {
    backToGame: '← Trò chơi Memory', eyebrow: 'CHƠI CÙNG NHAU',
    joinTitle: 'Vào phòng', joinIntro: 'Nhập mã phòng và tên của bạn. Sau đó đợi trò chơi bắt đầu.',
    roomCodeLabel: 'Mã phòng', nameLabel: 'Tên của bạn', joinSubmit: 'Vào phòng', joining: 'Đang kết nối …',
    invalidCode: 'Nhập mã phòng gồm 6 ký tự.',
    noAccessTitle: 'Chưa có quyền vào phòng',
    noAccessHint: 'Hãy vào phòng bằng mã phòng. Chủ phòng có thể cần mở lại phòng.',
    connecting: 'Đang kết nối tới phòng {code} …', retry: 'Thử lại',
    lobbyHost: 'Phòng của bạn', lobbyStudent: 'Đang đợi trò chơi bắt đầu …', roomLabel: 'Phòng',
    participants: 'Người chơi ({n})', noPlayers: 'Chưa có ai tham gia.',
    startGame: 'Bắt đầu trò chơi', teacherStarts: 'Giáo viên sẽ bắt đầu khi mọi người đã có mặt.',
    leaveRoom: 'Rời phòng', leaveGame: 'Rời trò chơi',
    pairsFound: 'Đã tìm được: {found} / {total} cặp', pickFirst: 'Chọn thẻ đầu tiên.',
    pickSecond: 'Chọn thẻ thứ hai.', waitResolve: 'Các thẻ sẽ hiển thị trong giây lát.',
    correct: 'Đúng! Bạn đã tìm được một cặp!', wrong: 'Rất tiếc, hai thẻ không khớp!',
    continueRound: 'Tiếp tục', skipTurn: 'Bỏ qua lượt',
    resultsEyebrow: 'HOÀN THÀNH', resultsTitle: 'Trò chơi kết thúc!', wins: '{name} thắng!',
    tie: 'Hòa: {names}', points: '{score} điểm', newGame: 'Trò chơi mới',
    hidden: 'Thẻ úp', revealed: 'Thẻ đã lật', foundBy: 'do {name} tìm thấy',
    turnEyebrow: 'LƯỢT HIỆN TẠI', yourTurn: 'Đến lượt bạn!', turnOf: 'Đến lượt {name}',
    waitingTurn: 'Đang chờ lượt tiếp theo',
    createTitle: 'Tạo phòng trực tuyến',
    createLead: 'Phòng sẽ bắt đầu bằng ngôn ngữ bạn đang chọn: {language}.',
    cancel: 'Hủy', createConfirm: 'Tạo phòng', creating: 'Đang tạo phòng …',
  },
} as const;

export type MemoryRoomCopyKey = keyof typeof memoryRoomCopy.en;

export function memoryText(locale: Locale, key: MemoryRoomCopyKey, values?: Record<string, string | number>): string {
  let result: string = memoryRoomCopy[locale][key];
  for (const [name, value] of Object.entries(values ?? {})) result = result.replaceAll('{' + name + '}', String(value));
  return result;
}

