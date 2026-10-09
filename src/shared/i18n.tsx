import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
export type Language = 'de' | 'en' | 'vi';
const dictionary = {
de: {
tagline:'Gemeinsam spielen und lernen',homeEyebrow:'SPIELERISCH LERNEN',homeLead:'Kurze Spiele für Unterricht, Gruppen und eigene Übung.',openGame:'Spiel öffnen',memoryDescription:'Passende Paare finden – lokal oder gemeinsam im Online-Raum.',
allGames:'Alle Spiele',learnTogether:'GEMEINSAM LERNEN',memoryTitle:'Memory-Spiel',findPairs:'Finde die passenden Paare!',createGame:'Spiel erstellen',createDesc:'Eigene Paare eingeben und einen gemeinsamen Raum starten.',joinRoom:'Raum beitreten',joinDesc:'Mit Raumcode und Namen zusammen spielen.',localPlay:'Lokal spielen',localDesc:'Gemeinsam an einem Gerät spielen.',back:'Zurück zur Auswahl',preparePairs:'Paare vorbereiten',pairInstructions:'Eine Zeile je Paar: LINKS | RECHTS | KATEGORIE (optional)',pairs:'Paare',loadExample:'Beispiel laden',clear:'Leeren',createOnline:'Online-Raum erstellen',shareRoom:'Teile den Raumcode und starte, sobald alle da sind.',creating:'Erstelle …',createRoom:'Raum erstellen',joinIntro:'Raumcode und Namen eingeben. Danach wartest du auf den Spielstart.',roomCode:'Raumcode',yourName:'Dein Name',connecting:'Verbinde …',joinFailed:'Beitritt fehlgeschlagen.',invalidCode:'Bitte gib einen 6-stelligen Raumcode ein.',playingTogether:'GEMEINSAM SPIELEN',yourRoom:'Dein Spielraum',waitingStart:'Warten auf den Start …',room:'Raum',participants:'Teilnehmende',noPlayers:'Noch niemand beigetreten.',startGame:'Spiel starten',teacherStarts:'Die Lehrkraft startet das Spiel, sobald alle da sind.',leaveRoom:'Raum verlassen',currentTurn:'AKTUELLER ZUG',yourTurn:'Du bist dran!',playerTurn:'{name} ist an der Reihe',waitTurn:'Warte auf den Zug',pairsFound:'Paare gefunden: {count} / {total}',pickFirst:'Wähle die erste Karte.',pickSecond:'Wähle die zweite Karte.',waitResolve:'Die Karten bleiben kurz sichtbar.',correct:'Richtig! Ein Paar gefunden!',wrong:'Das passt leider nicht!',nextTurn:'Der nächste Spieler ist dran.',yourTurnDetail:'Wähle zwei Karten.',continueResolve:'Auflösung fortsetzen',skipTurn:'Zug überspringen',leaveGame:'Spiel verlassen',finishedEyebrow:'GESCHAFFT',gameOver:'Spiel beendet!',wins:'{name} gewinnt!',tie:'Gleichstand: {names}',newGame:'Neues Spiel',points:'Punkte',point:'Punkt',localNames:'Spielernamen (durch Komma getrennt)',finishLocal:'Spiel beenden',again:'Nochmal spielen',settings:'Einstellungen',allFound:'Alle Paare gefunden!',winWith:'{name} gewinnt mit {score} {unit}!',tieWith:'Gleichstand ({score} Punkte): {names}',shareWith:'Mit der Gruppe teilen',joinLink:'Beitrittslink',copyLink:'Link kopieren',copied:'Kopiert!',shareAlternative:'Alternativ: Website öffnen und den Raumcode eingeben.',noAccess:'Kein Spielzugang gespeichert',noAccessHint:'Bitte über deinen Raumcode beitreten. Der Gastgeber muss den Raum gegebenenfalls erneut öffnen.',retry:'Erneut versuchen',notFound:'Seite nicht gefunden',home:'Zur Startseite',hiddenCard:'Verdeckte Karte',revealedCard:'Aufgedeckte Karte',language:'Sprache',roomLanguagePolicy:'Sprache im Spielraum',everyoneSameLanguage:'Alle verwenden meine gewählte Sprache',studentsChooseLanguage:'Teilnehmende wählen ihre eigene Sprache',serverError:'Verbindung fehlgeschlagen.',actionFailed:'Aktion fehlgeschlagen.',noResponse:'Keine Antwort vom Spielserver.'
},
en: {
tagline:'Play and learn together',homeEyebrow:'LEARN THROUGH PLAY',homeLead:'Quick games for classrooms, groups, and independent practice.',openGame:'Open game',memoryDescription:'Find matching pairs, locally or in an online room.',
allGames:'All games',learnTogether:'LEARN TOGETHER',memoryTitle:'Memory Game',findPairs:'Find the matching pairs!',createGame:'Create game',createDesc:'Enter your own pairs and start a shared room.',joinRoom:'Join room',joinDesc:'Play together using a room code and name.',localPlay:'Play locally',localDesc:'Play together on one device.',back:'Back to options',preparePairs:'Prepare pairs',pairInstructions:'One pair per line: LEFT | RIGHT | CATEGORY (optional)',pairs:'pairs',loadExample:'Load example',clear:'Clear',createOnline:'Create online room',shareRoom:'Share the room code and start when everyone has joined.',creating:'Creating …',createRoom:'Create room',joinIntro:'Enter the room code and your name, then wait for the game to start.',roomCode:'Room code',yourName:'Your name',connecting:'Connecting …',joinFailed:'Could not join room.',invalidCode:'Enter a six-character room code.',playingTogether:'PLAY TOGETHER',yourRoom:'Your game room',waitingStart:'Waiting for the game …',room:'Room',participants:'Players',noPlayers:'Nobody has joined yet.',startGame:'Start game',teacherStarts:'The teacher will start when everyone is ready.',leaveRoom:'Leave room',currentTurn:'CURRENT TURN',yourTurn:'Your turn!',playerTurn:"It's {name}'s turn",waitTurn:'Waiting for next turn',pairsFound:'Pairs found: {count} / {total}',pickFirst:'Choose your first card.',pickSecond:'Choose your second card.',waitResolve:'The cards stay visible for a moment.',correct:'Correct! You found a pair!',wrong:'Not a match!',nextTurn:'Next player is up.',yourTurnDetail:'Choose two cards.',continueResolve:'Continue resolution',skipTurn:'Skip turn',leaveGame:'Leave game',finishedEyebrow:'WELL DONE',gameOver:'Game over!',wins:'{name} wins!',tie:'Tie: {names}',newGame:'New game',points:'points',point:'point',localNames:'Player names (comma-separated)',finishLocal:'End game',again:'Play again',settings:'Settings',allFound:'All pairs found!',winWith:'{name} wins with {score} {unit}!',tieWith:'Tie ({score} points): {names}',shareWith:'Share with the group',joinLink:'Join link',copyLink:'Copy link',copied:'Copied!',shareAlternative:'Or open the website and enter the room code.',noAccess:'No room access saved',noAccessHint:'Join with your room code. The host may need to reopen the room.',retry:'Try again',notFound:'Page not found',home:'Back to home',hiddenCard:'Hidden card',revealedCard:'Revealed card',language:'Language',roomLanguagePolicy:'Room interface language',everyoneSameLanguage:'Everyone uses my selected language',studentsChooseLanguage:'Students choose their own language',serverError:'Connection failed.',actionFailed:'Action failed.',noResponse:'No response from game server.'
},
vi: {
tagline:'Cùng chơi, cùng học',homeEyebrow:'HỌC QUA TRÒ CHƠI',homeLead:'Trò chơi ngắn cho lớp học, nhóm và tự luyện tập.',openGame:'Mở trò chơi',memoryDescription:'Tìm các cặp phù hợp, chơi tại chỗ hoặc qua phòng trực tuyến.',
allGames:'Tất cả trò chơi',learnTogether:'CÙNG NHAU HỌC',memoryTitle:'Trò chơi Memory',findPairs:'Tìm các cặp thẻ phù hợp!',createGame:'Tạo trò chơi',createDesc:'Nhập các cặp thẻ và tạo phòng chơi chung.',joinRoom:'Vào phòng',joinDesc:'Chơi cùng nhau bằng mã phòng và tên.',localPlay:'Chơi trên một máy',localDesc:'Chơi cùng nhau trên một thiết bị.',back:'Quay lại lựa chọn',preparePairs:'Chuẩn bị các cặp',pairInstructions:'Mỗi dòng một cặp: TRÁI | PHẢI | DANH MỤC (tùy chọn)',pairs:'cặp',loadExample:'Tải ví dụ',clear:'Xóa',createOnline:'Tạo phòng trực tuyến',shareRoom:'Chia sẻ mã phòng rồi bắt đầu khi mọi người đã vào.',creating:'Đang tạo …',createRoom:'Tạo phòng',joinIntro:'Nhập mã phòng và tên, sau đó đợi bắt đầu.',roomCode:'Mã phòng',yourName:'Tên của bạn',connecting:'Đang kết nối …',joinFailed:'Không thể vào phòng.',invalidCode:'Nhập mã phòng gồm 6 ký tự.',playingTogether:'CHƠI CÙNG NHAU',yourRoom:'Phòng của bạn',waitingStart:'Đợi bắt đầu …',room:'Phòng',participants:'Người chơi',noPlayers:'Chưa có ai tham gia.',startGame:'Bắt đầu',teacherStarts:'Giáo viên sẽ bắt đầu khi mọi người sẵn sàng.',leaveRoom:'Rời phòng',currentTurn:'LƯỢT HIỆN TẠI',yourTurn:'Đến lượt bạn!',playerTurn:'Đến lượt {name}',waitTurn:'Đang chờ lượt',pairsFound:'Số cặp đã tìm: {count} / {total}',pickFirst:'Chọn thẻ đầu tiên.',pickSecond:'Chọn thẻ thứ hai.',waitResolve:'Các thẻ sẽ hiện trong giây lát.',correct:'Chính xác! Bạn đã tìm được một cặp!',wrong:'Chưa đúng cặp!',nextTurn:'Đến lượt người chơi tiếp theo.',yourTurnDetail:'Hãy chọn hai thẻ.',continueResolve:'Tiếp tục',skipTurn:'Bỏ qua lượt',leaveGame:'Rời trò chơi',finishedEyebrow:'HOÀN THÀNH',gameOver:'Trò chơi kết thúc!',wins:'{name} chiến thắng!',tie:'Hòa: {names}',newGame:'Trò chơi mới',points:'điểm',point:'điểm',localNames:'Tên người chơi (phân cách bằng dấu phẩy)',finishLocal:'Kết thúc trò chơi',again:'Chơi lại',settings:'Cài đặt',allFound:'Đã tìm hết các cặp!',winWith:'{name} thắng với {score} {unit}!',tieWith:'Hòa ({score} điểm): {names}',shareWith:'Chia sẻ với nhóm',joinLink:'Liên kết tham gia',copyLink:'Sao chép liên kết',copied:'Đã sao chép!',shareAlternative:'Hoặc mở trang web và nhập mã phòng.',noAccess:'Không tìm thấy quyền vào phòng',noAccessHint:'Hãy vào lại bằng mã phòng. Chủ phòng có thể cần mở lại phòng.',retry:'Thử lại',notFound:'Không tìm thấy trang',home:'Về trang chủ',hiddenCard:'Thẻ úp',revealedCard:'Thẻ đã mở',language:'Ngôn ngữ',roomLanguagePolicy:'Ngôn ngữ giao diện phòng',everyoneSameLanguage:'Mọi người dùng ngôn ngữ tôi đã chọn',studentsChooseLanguage:'Học viên tự chọn ngôn ngữ',serverError:'Lỗi kết nối.',actionFailed:'Thao tác thất bại.',noResponse:'Không nhận được phản hồi từ máy chủ.'
}
} as const;
type Key = keyof typeof dictionary.de;
type Translator = (key: Key, variables?: Record<string, string | number>) => string;
const LanguageContext = createContext<{language:Language;setLanguage:(language:Language)=>void;t:Translator}|null>(null);
export function LanguageProvider({children}:{children:ReactNode}) {
  const [language,setLanguage] = useState<Language>('de');
  const value = useMemo(() => ({
    language,setLanguage,
    t: ((key:Key,variables?:Record<string,string|number>) => {
      const line: string = dictionary[language][key];
      return line.replace(/\{(\w+)\}/g, (_match,name:string)=>String(variables?.[name]??''));
    }) as Translator,
  }),[language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const context=useContext(LanguageContext);
  if(!context) throw new Error('LanguageProvider missing');
  return context;
}
const languageOptions: ReadonlyArray<{code:Language;label:string}> = [
  {code:'de',label:'Deutsch'},
  {code:'en',label:'English'},
  {code:'vi',label:'Tiếng Việt'},
];

// Inline flag artwork ensures correct rendering on Windows, where flag emoji
// can appear as two-letter codes instead of images.
function LanguageFlag({code}:{code:Language}) {
  return <svg viewBox="0 0 60 36" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    {code==='de' ? <>
      <path fill="#171717" d="M0 0h60v12H0z"/>
      <path fill="#dd1d26" d="M0 12h60v12H0z"/>
      <path fill="#ffce00" d="M0 24h60v12H0z"/>
    </> : code==='en' ? <>
      <path fill="#012169" d="M0 0h60v36H0z"/>
      <path stroke="#fff" strokeWidth="9" d="M0 0 60 36M60 0 0 36"/>
      <path stroke="#c8102e" strokeWidth="3.5" d="M0 0 60 36M60 0 0 36"/>
      <path fill="#fff" d="M0 12h60v12H0zM24 0h12v36H24z"/>
      <path fill="#c8102e" d="M0 15h60v6H0zM27 0h6v36h-6z"/>
    </> : <>
      <path fill="#da251d" d="M0 0h60v36H0z"/>
      <path fill="#ffea00" d="m30 7 2.7 7.3 7.7.3-6.1 4.8 2.2 7.4-6.5-4.3-6.5 4.3 2.2-7.4-6.1-4.8 7.7-.3z"/>
    </>}
  </svg>;
}

export function LanguageSwitcher({appearance='select'}:{appearance?:'select'|'flags'}) {
  const {language,setLanguage,t}=useLanguage();
  if(appearance==='flags') return <div className="language-switcher language-switcher--flags" role="group" aria-label={t('language')}>
    {languageOptions.map(({code,label})=><button
      key={code}
      className="language-flag-button"
      type="button"
      aria-label={label}
      aria-pressed={language===code}
      title={label}
      onClick={()=>setLanguage(code)}
    ><span className="language-flag-icon"><LanguageFlag code={code}/></span></button>)}
  </div>;
  return <label className="language-switcher"><span className="sr-only">{t('language')}</span><select aria-label={t('language')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="de">DE</option><option value="en">EN</option><option value="vi">VI</option></select></label>;
}
