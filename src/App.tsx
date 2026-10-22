import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Aperture,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CloudRain,
  Download,
  Flame,
  Info,
  Keyboard,
  Leaf,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from 'lucide-react';
import { AuraCanvas } from './components/AuraCanvas';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AetherAudio } from './lib/audio';
import {
  createBlueprint,
  formatTime,
  getLastSevenDays,
  getStreak,
  sessionsToCsv,
  toDayKey,
} from './lib/planner';
import type { Energy, Session, Soundscape, View } from './types';

const SOUNDSCAPES: { id: Soundscape; name: string; icon: typeof Waves }[] = [
  { id: 'rain', name: 'Soft rain', icon: CloudRain },
  { id: 'still', name: 'Stillness', icon: Waves },
  { id: 'night', name: 'Night air', icon: Moon },
];

const ENERGY_LABELS = ['Running low', 'Gentle', 'Steady', 'Charged', 'Electric'];
const RING_LENGTH = 2 * Math.PI * 126;

function App() {
  const [view, setView] = useState<View>('studio');
  const [sessions, setSessions] = useLocalStorage<Session[]>('aether.sessions', []);
  const [intention, setIntention] = useLocalStorage('aether.intention', '');
  const [soundscape, setSoundscape] = useLocalStorage<Soundscape>('aether.soundscape', 'rain');
  const [duration, setDuration] = useState(25);
  const [energy, setEnergy] = useState<Energy>(3);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [toast, setToast] = useState('');
  const [audio] = useState(() => new AetherAudio());
  const endTime = useRef<number | null>(null);

  const plan = useMemo(() => createBlueprint(duration, energy), [duration, energy]);
  const progress = 1 - secondsLeft / (duration * 60);
  const todayMinutes = sessions
    .filter((session) => toDayKey(new Date(session.completedAt)) === toDayKey(new Date()))
    .reduce((sum, session) => sum + session.minutes, 0);

  const finishSession = useCallback(() => {
    const completed: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      intention: intention.trim() || 'Open focus session',
      minutes: duration,
      completedAt: new Date().toISOString(),
      energy,
      soundscape,
    };
    setSessions((current) => [completed, ...current]);
    setToast('Session complete. Notice what moved.');
  }, [duration, energy, intention, setSessions, soundscape]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(((endTime.current ?? Date.now()) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        endTime.current = null;
        setRunning(false);
        setSoundOn(false);
        finishSession();
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running, finishSession]);

  useEffect(() => {
    if (soundOn) {
      audio.start(soundscape, volume).catch(() => {
        setSoundOn(false);
        setToast('Audio could not start in this browser. Your timer still works.');
      });
    } else {
      void audio.stop();
    }
  }, [audio, soundOn, soundscape]);

  useEffect(() => audio.setVolume(volume), [audio, volume]);
  useEffect(() => () => { void audio.stop(); }, [audio]);

  useEffect(() => {
    document.title = running ? `${formatTime(secondsLeft)} · Aether` : 'Aether — Adaptive Focus Studio';
  }, [running, secondsLeft]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const toggleTimer = useCallback(() => {
    if (running) {
      setRunning(false);
      endTime.current = null;
      return;
    }
    const seconds = secondsLeft > 0 ? secondsLeft : duration * 60;
    if (secondsLeft === 0) setSecondsLeft(seconds);
    endTime.current = Date.now() + seconds * 1000;
    setSoundOn(true);
    setRunning(true);
  }, [duration, running, secondsLeft]);

  const resetTimer = useCallback(() => {
    setRunning(false);
    endTime.current = null;
    setSecondsLeft(duration * 60);
  }, [duration]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      if (event.code === 'Space') {
        event.preventDefault();
        toggleTimer();
      }
      if (event.key.toLowerCase() === 'r') resetTimer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetTimer, toggleTimer]);

  const chooseDuration = (minutes: number) => {
    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    setRunning(false);
    endTime.current = null;
  };

  const exportSessions = () => {
    const blob = new Blob([sessionsToCsv(sessions)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `aether-sessions-${toDayKey(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const addDemoWeek = () => {
    const intentions = ['Shape the first draft', 'Deep work on the prototype', 'Read and synthesize', 'Plan the next milestone', 'Build without browsing', 'Refine the details'];
    const demo = intentions.map((task, index): Session => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      date.setHours(10 + (index % 3), 15, 0, 0);
      return {
        id: `demo-${Date.now()}-${index}`,
        intention: task,
        minutes: [25, 45, 25, 60, 45, 25][index],
        completedAt: date.toISOString(),
        energy: ([2, 3, 4, 3, 5, 4][index]) as Energy,
        soundscape: SOUNDSCAPES[index % 3].id,
      };
    });
    setSessions(demo.reverse());
    setToast('Sample week added. Complete a session to start your real history.');
  };

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('studio')} aria-label="Aether home">
          <span className="brand-mark"><Aperture size={22} strokeWidth={1.7} /></span>
          <span>AETHER<span className="brand-dot">®</span></span>
        </button>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === 'studio' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('studio')}>
            <Sparkles size={18} /> <span>Focus studio</span><span className="nav-index">01</span>
          </button>
          <button className={view === 'insights' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('insights')}>
            <BarChart3 size={18} /> <span>Your rhythm</span><span className="nav-index">02</span>
          </button>
          <button className={view === 'about' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('about')}>
            <Info size={18} /> <span>About Aether</span><span className="nav-index">03</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="small-orbit"><span /><span /><span /></div>
          <p>“Almost everything will work again if you unplug it for a few minutes, including you.”</p>
          <span className="quote-author">— ANNE LAMOTT</span>
          <div className="privacy-note"><ShieldCheck size={15} /><span>Local-first. Always private.</span></div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigate('studio')}><Aperture size={21} /> AETHER</button>
          <div className="today-label">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
          <div className="topbar-right">
            <span className="local-badge"><span className="status-dot" /> ALL SYSTEMS QUIET</span>
            <button className="icon-button help-button" onClick={() => navigate('about')} aria-label="About and keyboard shortcuts"><Info size={18} /></button>
          </div>
        </header>

        <div className="page-content">
          {view === 'studio' && (
            <>
              <section className="page-heading studio-heading">
                <div>
                  <div className="eyebrow"><span /> ADAPTIVE FOCUS STUDIO</div>
                  <h1>Make space for<br /><em>what matters.</em></h1>
                </div>
                <p className="heading-note">Not another productivity race.<br />A quieter way to do meaningful work.</p>
              </section>

              <div className="studio-grid">
                <section className="card intention-card">
                  <div className="card-kicker"><span>01</span> SET THE CONDITIONS</div>
                  <label className="field-label" htmlFor="intention">What deserves your attention?</label>
                  <div className="intention-input-wrap">
                    <input
                      id="intention"
                      value={intention}
                      onChange={(event) => setIntention(event.target.value)}
                      placeholder="Write, design, solve, learn…"
                      maxLength={80}
                    />
                    <ArrowUpRight size={18} />
                  </div>
                  <p className="field-hint">One clear intention is enough.</p>

                  <div className="field-group">
                    <div className="field-label-row">
                      <span className="field-label">How is your energy?</span>
                      <span className="energy-label">{ENERGY_LABELS[energy - 1]}</span>
                    </div>
                    <div className="energy-picker" role="group" aria-label="Current energy level">
                      {([1, 2, 3, 4, 5] as Energy[]).map((level) => (
                        <button
                          key={level}
                          className={energy === level ? 'energy-button selected' : 'energy-button'}
                          onClick={() => setEnergy(level)}
                          aria-label={`Energy ${level} of 5: ${ENERGY_LABELS[level - 1]}`}
                          aria-pressed={energy === level}
                        >
                          <Zap size={14} fill={energy >= level ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                    <div className="range-labels"><span>LOW</span><span>HIGH</span></div>
                  </div>

                  <div className="field-group duration-group">
                    <span className="field-label">Time available</span>
                    <div className="duration-picker">
                      {[15, 25, 45, 60].map((minutes) => (
                        <button key={minutes} className={duration === minutes ? 'duration-button selected' : 'duration-button'} onClick={() => chooseDuration(minutes)}>
                          {minutes}<span>min</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="adaptation-note"><Leaf size={16} /><span>Your plan softens or stretches with your energy.</span></div>
                </section>

                <section className={running ? 'card timer-card is-running' : 'card timer-card'}>
                  <AuraCanvas active={running} energy={energy} />
                  <div className="timer-topline">
                    <span className="session-state"><span className={running ? 'status-dot pulsing' : 'status-dot'} />{running ? 'IN YOUR ELEMENT' : secondsLeft === 0 ? 'SESSION COMPLETE' : 'READY WHEN YOU ARE'}</span>
                    <button className="icon-button sound-toggle" onClick={() => setSoundOn((current) => !current)} aria-label={soundOn ? 'Mute soundscape' : 'Enable soundscape'}>
                      {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                  </div>
                  <div className="timer-center">
                    <div className="timer-ring-wrap">
                      <svg className="timer-ring" viewBox="0 0 280 280" aria-hidden="true">
                        <circle className="ring-track" cx="140" cy="140" r="126" />
                        <circle className="ring-progress" cx="140" cy="140" r="126" style={{ strokeDashoffset: RING_LENGTH * (1 - progress) }} />
                      </svg>
                      <div className="timer-display">
                        <span className="timer-intention">{intention.trim() || 'Open focus'}</span>
                        <div className="time-value">{formatTime(secondsLeft)}</div>
                        <span className="time-caption">MINUTES&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SECONDS</span>
                      </div>
                    </div>
                    <div className="timer-controls">
                      <button className="reset-button" onClick={resetTimer} aria-label="Reset timer"><RotateCcw size={19} /></button>
                      <button className="play-button" onClick={toggleTimer}>
                        {running ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                        <span>{running ? 'Pause session' : secondsLeft === 0 ? 'Begin again' : secondsLeft < duration * 60 ? 'Return to focus' : 'Begin session'}</span>
                      </button>
                      <span className="control-spacer" />
                    </div>
                    <span className="shortcut-hint"><kbd>SPACE</kbd> TO {running ? 'PAUSE' : 'BEGIN'}</span>
                  </div>
                </section>

                <section className="card blueprint-card">
                  <div className="card-kicker"><span>02</span> YOUR SESSION BLUEPRINT</div>
                  <h2>A gentle structure.<br />Not a rigid rule.</h2>
                  <div className="blueprint-steps">
                    {plan.map((step, index) => (
                      <div className="blueprint-step" key={step.label}>
                        <div className={`step-marker ${step.tone}`}>{index + 1}</div>
                        <div className="step-copy">
                          <div className="step-title">{step.label}<span>{step.minutes} min</span></div>
                          <p>{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sound-section">
                    <div className="field-label-row"><span className="field-label">Generative soundscape</span><span className="live-tag">LIVE AUDIO</span></div>
                    <div className="sound-options">
                      {SOUNDSCAPES.map(({ id, name, icon: Icon }) => (
                        <button key={id} className={soundscape === id ? 'sound-option selected' : 'sound-option'} onClick={() => setSoundscape(id)} aria-pressed={soundscape === id}>
                          <Icon size={17} /><span>{name}</span>{soundscape === id && <Check size={13} className="sound-check" />}
                        </button>
                      ))}
                    </div>
                    <div className="volume-row">
                      <VolumeX size={14} />
                      <input aria-label="Soundscape volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
                      <Volume2 size={14} />
                    </div>
                  </div>
                </section>
              </div>

              <section className="today-strip">
                <div className="today-message"><span className="mini-spark">✳</span><p>Today isn’t asking for everything.<br /><strong>Just your attention, right here.</strong></p></div>
                <div className="today-stat"><span>FOCUS TODAY</span><strong>{todayMinutes}<small> min</small></strong></div>
                <div className="today-stat"><span>SESSIONS</span><strong>{sessions.filter((session) => toDayKey(new Date(session.completedAt)) === toDayKey(new Date())).toString().padStart(2, '0')}</strong></div>
                <button className="text-button" onClick={() => navigate('insights')}>See your rhythm <ArrowRight size={16} /></button>
              </section>
            </>
          )}

          {view === 'insights' && (
            <InsightsView
              sessions={sessions}
              onExport={exportSessions}
              onClear={() => {
                if (window.confirm('Clear all Aether session history from this browser?')) setSessions([]);
              }}
              onDemo={addDemoWeek}
              onBack={() => navigate('studio')}
            />
          )}

          {view === 'about' && <AboutView onBack={() => navigate('studio')} />}
        </div>

        <footer className="app-footer"><span>AETHER / VERSION 1.0</span><span>DESIGNED FOR DEEPER WORK, NOT MORE WORK.</span></footer>
      </main>
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

interface InsightsProps {
  sessions: Session[];
  onExport: () => void;
  onClear: () => void;
  onDemo: () => void;
  onBack: () => void;
}

function InsightsView({ sessions, onExport, onClear, onDemo, onBack }: InsightsProps) {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const averageEnergy = sessions.length ? (sessions.reduce((sum, session) => sum + session.energy, 0) / sessions.length).toFixed(1) : '—';
  const days = getLastSevenDays(sessions);
  const maxMinutes = Math.max(...days.map((day) => day.minutes), 60);

  return (
    <>
      <section className="page-heading insights-heading">
        <div><div className="eyebrow"><span /> YOUR RHYTHM</div><h1>Notice the pattern.<br /><em>Keep what serves you.</em></h1></div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={onExport} disabled={!sessions.length}><Download size={16} /> Export CSV</button>
          <button className="icon-button" onClick={onClear} disabled={!sessions.length} aria-label="Clear session history"><Trash2 size={17} /></button>
        </div>
      </section>
      <div className="stats-grid">
        <div className="stat-card"><span className="stat-icon lime"><Sparkles size={17} /></span><span className="stat-label">TOTAL FOCUS</span><strong>{totalMinutes}<small> min</small></strong><p>Time you chose to be here.</p></div>
        <div className="stat-card"><span className="stat-icon violet"><Check size={17} /></span><span className="stat-label">SESSIONS</span><strong>{sessions.length.toString().padStart(2, '0')}</strong><p>Small beginnings, completed.</p></div>
        <div className="stat-card"><span className="stat-icon warm"><Flame size={17} /></span><span className="stat-label">CURRENT STREAK</span><strong>{getStreak(sessions)}<small> days</small></strong><p>Consistency without the pressure.</p></div>
        <div className="stat-card"><span className="stat-icon blue"><Zap size={17} /></span><span className="stat-label">AVERAGE ENERGY</span><strong>{averageEnergy}<small>{sessions.length ? ' / 5' : ''}</small></strong><p>A check-in, not a score.</p></div>
      </div>
      <div className="insights-grid">
        <section className="card rhythm-card">
          <div className="card-title-row"><div><div className="card-kicker">THE LAST SEVEN DAYS</div><h2>Your attention, over time.</h2></div><span className="chart-unit">MINUTES / DAY</span></div>
          <div className="bar-chart" aria-label="Focus minutes over the last seven days">
            {days.map((day) => (
              <div className="bar-column" key={day.key}>
                <span className="bar-value">{day.minutes || ''}</span>
                <div className="bar-track"><div className={day.key === toDayKey(new Date()) ? 'bar-fill today' : 'bar-fill'} style={{ height: `${Math.max(day.minutes ? 8 : 2, (day.minutes / maxMinutes) * 100)}%` }} /></div>
                <span className="bar-label">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="chart-insight"><Leaf size={17} /><p>{totalMinutes ? 'The goal isn’t a perfect chart. It’s learning the conditions that help you return.' : 'Your first completed session will begin your rhythm. There is nothing to catch up on.'}</p></div>
        </section>
        <section className="card history-card">
          <div className="card-title-row"><div><div className="card-kicker">RECENT SESSIONS</div><h2>Moments of focus.</h2></div></div>
          {sessions.length ? (
            <div className="history-list">
              {sessions.slice(0, 6).map((session) => (
                <div className="history-item" key={session.id}>
                  <span className="history-dot" />
                  <div><strong>{session.intention}</strong><span>{new Date(session.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {SOUNDSCAPES.find((sound) => sound.id === session.soundscape)?.name}</span></div>
                  <span className="history-minutes">{session.minutes}m</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><span className="empty-orbit"><Aperture size={30} /></span><h3>A quiet canvas.</h3><p>Complete a focus session, or explore the dashboard with a sample week.</p><button className="secondary-button" onClick={onDemo}>Add sample week <ArrowUpRight size={15} /></button></div>
          )}
          <button className="text-button back-to-studio" onClick={onBack}>Begin a new session <ArrowRight size={16} /></button>
        </section>
      </div>
    </>
  );
}

function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <div className="about-view">
      <section className="about-hero">
        <span className="about-mark"><Aperture size={46} strokeWidth={1.2} /></span>
        <div className="eyebrow"><span /> BUILT FOR A NOISY WORLD</div>
        <h1>Technology that knows<br /><em>when to be quiet.</em></h1>
        <p>Aether is an adaptive, local-first focus studio. It turns your available time and current energy into a gentle session plan—then gives you a generated audiovisual space to follow it.</p>
        <button className="play-button about-cta" onClick={onBack}>Enter the studio <ArrowRight size={18} /></button>
      </section>
      <div className="principles-grid">
        <section className="principle-card"><span>01 / ADAPTIVE</span><Leaf size={24} /><h2>Start where you are.</h2><p>Low energy changes the shape of your session, not your worth. Aether creates a softer arrival when you need it and more room for flow when you don’t.</p></section>
        <section className="principle-card"><span>02 / GENERATIVE</span><Waves size={24} /><h2>Nothing on repeat.</h2><p>Rain, harmonic stillness, and night air are synthesized live with the Web Audio API. No streams, audio files, or third-party requests.</p></section>
        <section className="principle-card"><span>03 / PRIVATE</span><ShieldCheck size={24} /><h2>Your mind is yours.</h2><p>Intentions and session history stay in your browser’s local storage. There are no accounts, trackers, ads, or servers learning from you.</p></section>
      </div>
      <section className="card shortcuts-card">
        <div><div className="card-kicker"><Keyboard size={15} /> QUIET SHORTCUTS</div><h2>Keep your hands in the flow.</h2></div>
        <div className="shortcut-list"><span><kbd>SPACE</kbd> Begin / pause</span><span><kbd>R</kbd> Reset timer</span></div>
      </section>
    </div>
  );
}

export default App;
