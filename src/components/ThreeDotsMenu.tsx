import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreVertical,
  X,
  Shield,
  Settings,
  BookOpen,
  GraduationCap,
  Globe,
  Gamepad2,
  Brain,
  Clock,
  Volume2,
  Info,
  Power,
  Sparkles,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { LeoLifeState, LeoSettings, LeoEmotion } from '../types/leo';

interface ThreeDotsMenuProps {
  lifeState: LeoLifeState;
  settings: LeoSettings;
  onUpdateSettings: (newSettings: Partial<LeoSettings>) => void;
  onTogglePower: () => void;
  onTriggerStoryMode: () => void;
  onTriggerStudyMode: () => void;
  onTriggerGameMode: () => void;
  onTriggerLanguageMode: () => void;
  onTestEmotion: (emotion: LeoEmotion) => void;
  sessionDurationSeconds: number;
}

export const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = ({
  lifeState,
  settings,
  onUpdateSettings,
  onTogglePower,
  onTriggerStoryMode,
  onTriggerStudyMode,
  onTriggerGameMode,
  onTriggerLanguageMode,
  onTestEmotion,
  sessionDurationSeconds,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Parental Gate state
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);
  const [parentChallenge, setParentChallenge] = useState<{ q: string; a: number }>({ q: '8 × 7', a: 56 });
  const [parentInput, setParentInput] = useState('');
  const [parentError, setParentError] = useState(false);

  const generateParentChallenge = () => {
    const n1 = Math.floor(Math.random() * 8) + 6;
    const n2 = Math.floor(Math.random() * 7) + 4;
    setParentChallenge({ q: `${n1} × ${n2}`, a: n1 * n2 });
    setParentInput('');
    setParentError(false);
  };

  const handleOpenParentControls = () => {
    if (isParentUnlocked) {
      setActiveModal('parents');
    } else {
      generateParentChallenge();
      setActiveModal('parent_gate');
    }
  };

  const handleVerifyParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(parentInput.trim(), 10) === parentChallenge.a) {
      setIsParentUnlocked(true);
      setActiveModal('parents');
    } else {
      setParentError(true);
    }
  };

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const menuItems = [
    {
      id: 'parents',
      icon: Shield,
      label: 'Controle dos Pais',
      emoji: '👨‍👩‍👧',
      action: handleOpenParentControls,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Configurações',
      emoji: '⚙️',
      action: () => setActiveModal('settings'),
    },
    {
      id: 'stories',
      icon: BookOpen,
      label: 'Histórias',
      emoji: '📚',
      action: () => {
        onTriggerStoryMode();
        setIsOpen(false);
      },
    },
    {
      id: 'studies',
      icon: GraduationCap,
      label: 'Estudos',
      emoji: '🎓',
      action: () => {
        onTriggerStudyMode();
        setIsOpen(false);
      },
    },
    {
      id: 'languages',
      icon: Globe,
      label: 'Idiomas',
      emoji: '🌎',
      action: () => {
        onTriggerLanguageMode();
        setIsOpen(false);
      },
    },
    {
      id: 'games',
      icon: Gamepad2,
      label: 'Jogos',
      emoji: '🎮',
      action: () => {
        onTriggerGameMode();
        setIsOpen(false);
      },
    },
    {
      id: 'memory',
      icon: Brain,
      label: 'Memória',
      emoji: '🧠',
      action: () => setActiveModal('memory'),
    },
    {
      id: 'usage',
      icon: Clock,
      label: 'Tempo de uso',
      emoji: '⏱️',
      action: () => setActiveModal('usage'),
    },
    {
      id: 'voice',
      icon: Volume2,
      label: 'Voz & Luz',
      emoji: '🔊',
      action: () => setActiveModal('voice'),
    },
    {
      id: 'about',
      icon: Info,
      label: 'Sobre o LÉO',
      emoji: 'ℹ️',
      action: () => setActiveModal('about'),
    },
  ];

  return (
    <>
      {/* Discreet 3-dots trigger button in top-right */}
      <div className="fixed top-5 right-5 z-40">
        <motion.button
          whileHover={{ scale: 1.1, opacity: 0.9 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir menu"
          className="p-3 rounded-full text-white/40 hover:text-white/90 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 border border-white/5 shadow-lg group focus:outline-none"
        >
          {isOpen ? (
            <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
          ) : (
            <MoreVertical className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Quick Power sleep/wake toggle on top-left (very subtle) */}
      <div className="fixed top-5 left-5 z-40">
        <motion.button
          whileHover={{ scale: 1.08, opacity: 0.8 }}
          whileTap={{ scale: 0.92 }}
          onClick={onTogglePower}
          title={lifeState === 'OFF' || lifeState === 'SLEEPING' ? 'Acordar LÉO' : 'Desligar LÉO (Dormir)'}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium backdrop-blur-md transition-all border ${
            lifeState === 'OFF' || lifeState === 'SLEEPING'
              ? 'bg-emerald-950/40 text-emerald-300/80 border-emerald-500/20 hover:text-emerald-200'
              : 'bg-white/5 text-white/40 hover:text-white/80 border-white/5'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{lifeState === 'OFF' || lifeState === 'SLEEPING' ? 'Acordar' : 'Dormir'}</span>
        </motion.button>
      </div>

      {/* Frosted Glass Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="fixed top-20 right-6 z-50 w-72 sm:w-80 max-h-[82vh] overflow-y-auto rounded-3xl p-3 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white/90 select-none custom-scrollbar"
              style={{
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9), inset 0 1px 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              {/* Header */}
              <div className="px-4 py-2.5 mb-1 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Menu do LÉO
                  </span>
                </div>
                <span className="text-[10px] text-white/40 font-mono">
                  {lifeState}
                </span>
              </div>

              {/* Menu List */}
              <div className="space-y-1 py-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                        {item.emoji}
                      </span>
                      <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Quick Emotion Sandbox */}
              <div className="mt-3 pt-3 border-t border-white/10 px-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                    Expressões de Luz
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300/60" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['FELIZ', 'CURIOSO', 'PENSANDO', 'CONFUSO', 'SURPRESO', 'COMEMORANDO'] as LeoEmotion[]).map(
                    (emo) => (
                      <button
                        key={emo}
                        onClick={() => {
                          onTestEmotion(emo);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 text-[11px] font-medium text-white/70 hover:text-white transition-all text-center"
                      >
                        {emo === 'FELIZ' && '😊 Feliz'}
                        {emo === 'CURIOSO' && '🧐 Curioso'}
                        {emo === 'PENSANDO' && '💭 Pensa'}
                        {emo === 'CONFUSO' && '❓ Confuso'}
                        {emo === 'SURPRESO' && '😮 Surpreso'}
                        {emo === 'COMEMORANDO' && '⭐ Festa'}
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Parental Gate Modal */}
      <AnimatePresence>
        {activeModal === 'parent_gate' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 bg-zinc-900/95 border border-white/15 shadow-2xl text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Área dos Pais</h3>
                  <p className="text-xs text-white/50">Por favor, resolva para confirmar que é adulto</p>
                </div>
              </div>

              <form onSubmit={handleVerifyParent} className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <span className="text-xs uppercase tracking-widest text-white/40 block mb-1">
                    Quanto é:
                  </span>
                  <span className="text-2xl font-mono font-bold text-amber-200">
                    {parentChallenge.q} = ?
                  </span>
                </div>

                <input
                  type="number"
                  autoFocus
                  placeholder="Sua resposta"
                  value={parentInput}
                  onChange={(e) => {
                    setParentInput(e.target.value);
                    setParentError(false);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-center text-xl font-mono focus:outline-none focus:border-amber-400"
                />

                {parentError && (
                  <p className="text-xs text-red-400 text-center">Resposta incorreta. Tente novamente.</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors shadow-lg"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Parental Controls & Profile Modal */}
      <AnimatePresence>
        {activeModal === 'parents' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl p-6 bg-zinc-900/95 border border-white/15 shadow-2xl text-white space-y-5 custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-lg">Controle dos Pais</h3>
                    <p className="text-xs text-white/50">Personalize a experiência do seu filho com o LÉO</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-full text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Child profile info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Perfil da Criança
                </h4>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Nome da criança</label>
                  <input
                    type="text"
                    value={settings.childProfile.name}
                    onChange={(e) =>
                      onUpdateSettings({
                        childProfile: { ...settings.childProfile, name: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm focus:outline-none focus:border-emerald-400"
                    placeholder="Ex: Sofia, Lucas..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Idade</label>
                    <input
                      type="text"
                      value={settings.childProfile.age}
                      onChange={(e) =>
                        onUpdateSettings({
                          childProfile: { ...settings.childProfile, age: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm focus:outline-none focus:border-emerald-400"
                      placeholder="Ex: 5 anos"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Animal favorito</label>
                    <input
                      type="text"
                      value={settings.childProfile.favoriteAnimal}
                      onChange={(e) =>
                        onUpdateSettings({
                          childProfile: { ...settings.childProfile, favoriteAnimal: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm focus:outline-none focus:border-emerald-400"
                      placeholder="Ex: Golfinho, Cachorrinho"
                    />
                  </div>
                </div>
              </div>

              {/* Time limits */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Limite de Tempo por Sessão
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 15, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onUpdateSettings({ screenTimeLimitMinutes: mins })}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                        settings.screenTimeLimitMinutes === mins
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {mins === 0 ? 'Sem limite' : `${mins} min`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
                >
                  Salvar e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice & Light Settings Modal */}
      <AnimatePresence>
        {activeModal === 'voice' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl p-6 bg-zinc-900/95 border border-white/15 shadow-2xl text-white space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-6 h-6 text-sky-400" />
                  <div>
                    <h3 className="font-semibold text-lg">Voz & Brilho Luminoso</h3>
                    <p className="text-xs text-white/50">Personalize o tom e as luzes digitais do LÉO</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-full text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Light tone selector */}
              <div>
                <label className="text-xs text-white/70 block mb-2 font-medium">
                  Tonalidade da Luz Digital
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pure-white', label: 'Branco Puro', desc: 'Clássico luminoso' },
                    { id: 'warm-white', label: 'Estrela Quente', desc: 'Aconchegante e suave' },
                    { id: 'cyan-lumen', label: 'Azul Cósmico', desc: 'Digital futurista' },
                    { id: 'aurora', label: 'Aurora Boreal', desc: 'Mágico e cintilante' },
                  ].map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => onUpdateSettings({ lightTone: tone.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        settings.lightTone === tone.id
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs font-semibold block">{tone.label}</span>
                      <span className="text-[10px] text-white/40">{tone.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity slider */}
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>Intensidade do Brilho</span>
                  <span>{Math.round(settings.lightIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={settings.lightIntensity}
                  onChange={(e) => onUpdateSettings({ lightIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>

              {/* Voice pitch slider */}
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>Tom da Voz do LÉO</span>
                  <span className="text-sky-300 font-medium">
                    {settings.voicePitch <= 1.15
                      ? 'Adulto / Mais Grave'
                      : settings.voicePitch <= 1.36
                      ? 'Voz Fofinha (Amiguinho) 🧸✨'
                      : 'Super Aguda / Desenho'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.02"
                  value={settings.voicePitch}
                  onChange={(e) => onUpdateSettings({ voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>

              {/* Modo Conversa Contínua (Hands-free / Turn-taking) */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="pr-3">
                  <span className="text-xs font-semibold block text-white flex items-center gap-1.5">
                    <span>🎙️</span>
                    <span>Modo Conversa Contínua</span>
                  </span>
                  <span className="text-[10px] text-white/50 leading-relaxed block mt-0.5">
                    A criança toca uma vez e a conversa flui automaticamente (mãos livres com VAD)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      continuousConversationMode: !settings.continuousConversationMode,
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 flex-shrink-0 ${
                    settings.continuousConversationMode !== false ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.continuousConversationMode !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
              >
                Concluir
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Screen Time Modal */}
      <AnimatePresence>
        {activeModal === 'usage' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 bg-zinc-900/95 border border-white/15 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold text-lg">Tempo de Uso</h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-full text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-xs uppercase tracking-widest text-white/40 block mb-1">
                  Tempo na conversa atual
                </span>
                <span className="text-3xl font-mono font-bold text-purple-300">
                  {formatSeconds(sessionDurationSeconds)}
                </span>
              </div>

              <p className="text-xs text-white/50 text-center">
                O LÉO avisa carinhosamente quando estiver na hora de descansar os olhinhos e dormir!
              </p>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm transition-colors"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Memory Modal */}
      <AnimatePresence>
        {activeModal === 'memory' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 bg-zinc-900/95 border border-white/15 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-pink-400" />
                  <h3 className="font-semibold text-lg">Memória do LÉO</h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-full text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 block">Amiguinho</span>
                  <span className="font-semibold text-white/90">
                    {settings.childProfile.name || 'Meu melhor amiguinho(a)'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 block">Bichinho que adora</span>
                  <span className="font-semibold text-white/90">
                    {settings.childProfile.favoriteAnimal || 'Todos os animais fofinhos!'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-xs text-white/40 block">Lembranças felizes</span>
                  <span className="font-semibold text-white/90">
                    Sempre pronto para inventar histórias e rir juntos!
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-2xl bg-pink-500 hover:bg-pink-400 text-white font-semibold text-sm transition-colors"
              >
                Que fofo!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About LÉO Modal */}
      <AnimatePresence>
        {activeModal === 'about' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 bg-zinc-900/95 border border-white/15 shadow-2xl text-white space-y-4 text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                ✨
              </div>

              <h3 className="font-bold text-xl">LÉO</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Um pequeno ser digital de luz que vive na tela como o melhor amigo virtual de uma criança.
                Sem botões complicados, sem textos de chat: apenas presença, afeto e conversas mágicas.
              </p>

              <div className="text-[11px] text-white/40 pt-2 border-t border-white/10">
                Regra de ouro: Menos interface, mais personagem.
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
              >
                Voltar ao LÉO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
