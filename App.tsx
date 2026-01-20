

import React, { useState, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Controls } from './components/Controls';
import { Button } from './components/Button';
import { GameState, GameMode, Team, LeagueStats, PenaltyResult } from './types';
import { TOTAL_BALLS, TOTAL_PENALTIES, HALF_DURATION, WORLD_CUP_TEAMS, LEAGUE_TEAMS, TOTAL_LEAGUE_MATCHES } from './constants';
import { Trophy, Clock, PlayCircle, History, CheckCircle2, ChevronRight, Crown, Medal, ListOrdered, Shield, Star, Zap, Globe2, Target } from 'lucide-react';

const STORAGE_KEY = 'foosball_master_save_data';

const ROUND_NAMES = [
  "Clasificatoria",
  "Cuartos de Final",
  "Semifinal",
  "GRAN FINAL"
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    mode: 'arcade',
    scorePlayer: 0,
    scoreAI: 0,
    ballsPlayed: 1,
    timeLeft: HALF_DURATION,
    half: 1,
    winner: null,
    tournamentRound: 0
  });

  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Check for saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (['playing', 'halftime', 'nextLevel', 'leagueTable'].includes(parsed.status)) {
          setHasSavedGame(true);
        }
      } catch (e) {
        console.error("Failed to parse save data", e);
      }
    }
  }, []);

  // Save game progress automatically
  useEffect(() => {
    const saveableStatuses = ['playing', 'halftime', 'nextLevel', 'leagueTable'];
    if (saveableStatuses.includes(gameState.status)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
      setHasSavedGame(true);
    } else if (gameState.status === 'gameover' || gameState.status === 'victory') {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedGame(false);
    }
  }, [gameState]);

  // Intercept gameover from penalty shootout during world cup to handle progression
  useEffect(() => {
    if (gameState.status === 'gameover' && gameState.previousMode === 'worldcup') {
        if (gameState.winner === 'player') {
            const currentRound = gameState.tournamentRound;
            if (currentRound >= 3) {
                 setGameState(prev => ({ ...prev, status: 'victory', mode: 'worldcup', previousMode: null, winner: 'player' }));
            } else {
                const nextOpponent = getRandomOpponent('worldcup', gameState.playerTeam!.id);
                setGameState(prev => ({
                    ...prev,
                    status: 'nextLevel',
                    mode: 'worldcup',
                    previousMode: null,
                    tournamentRound: currentRound + 1,
                    aiTeam: nextOpponent,
                    scorePlayer: 0,
                    scoreAI: 0,
                    winner: null,
                    ballsPlayed: 0,
                    timeLeft: HALF_DURATION,
                }));
            }
        } else { // Player lost shootout
            setGameState(prev => ({ ...prev, mode: 'worldcup', previousMode: null }));
        }
    }
  }, [gameState.status, gameState.winner, gameState.previousMode]);


  // Timer Logic
  useEffect(() => {
    let timer: number;
    if (gameState.status === 'playing' && (gameState.mode === 'worldcup' || gameState.mode === 'league')) {
      timer = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 0) {
             let winner: 'player' | 'ai' | 'draw' = 'draw';
             if (prev.scorePlayer > prev.scoreAI) winner = 'player';
             else if (prev.scoreAI > prev.scorePlayer) winner = 'ai';
             else winner = 'draw';
             
             return handleMatchEnd(prev, winner);
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.status, gameState.mode]);

  const gameActionsRef = useRef<{ 
    kickDefense: () => void; 
    kickAttack: () => void;
    moveDefense: (y: number | null) => void;
    moveAttack: (y: number | null) => void;
  } | null>(null);

  const getRandomOpponent = (mode: GameMode, excludeTeamId: string): Team => {
    const sourceList = mode === 'league' ? LEAGUE_TEAMS : WORLD_CUP_TEAMS;
    const available = sourceList.filter(t => t.id !== excludeTeamId);
    return available[Math.floor(Math.random() * available.length)];
  };

  const updateTeamStats = (table: LeagueStats[], teamId: string, goalsScored: number, goalsConceded: number): LeagueStats[] => {
      return table.map(entry => {
          if (entry.team.id !== teamId) return entry;
          let points = 0, win = 0, draw = 0, loss = 0;
          if (goalsScored > goalsConceded) { points = 3; win = 1; }
          else if (goalsScored === goalsConceded) { points = 1; draw = 1; }
          else { loss = 1; }
          return {
              ...entry,
              matchesPlayed: entry.matchesPlayed + 1,
              goalsFor: entry.goalsFor + goalsScored,
              goalsAgainst: entry.goalsAgainst + goalsConceded,
              wins: entry.wins + win,
              draws: entry.draws + draw,
              losses: entry.losses + loss,
              points: entry.points + points
          };
      });
  };

  const handleMatchEnd = (prevState: GameState, winner: 'player' | 'ai' | 'draw'): GameState => {
      if (prevState.mode === 'arcade' || prevState.mode === 'penalties') {
          return { ...prevState, status: 'gameover', winner };
      }

      if (prevState.mode === 'league') {
          let table = [...(prevState.leagueTable || [])];
          table = updateTeamStats(table, prevState.playerTeam!.id, prevState.scorePlayer, prevState.scoreAI);
          table = updateTeamStats(table, prevState.aiTeam!.id, prevState.scoreAI, prevState.scorePlayer);

          const playedIds = [prevState.playerTeam!.id, prevState.aiTeam!.id];
          const remainingTeams = table.filter(t => !playedIds.includes(t.team.id));
          const shuffled = remainingTeams.sort(() => 0.5 - Math.random());
          
          for (let i = 0; i < shuffled.length; i += 2) {
              if (i + 1 < shuffled.length) {
                  const t1 = shuffled[i];
                  const t2 = shuffled[i+1];
                  const score1 = Math.floor(Math.random() * 4);
                  const score2 = Math.floor(Math.random() * 4);
                  table = updateTeamStats(table, t1.team.id, score1, score2);
                  table = updateTeamStats(table, t2.team.id, score2, score1);
              }
          }

          table.sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              const gdA = a.goalsFor - a.goalsAgainst;
              const gdB = b.goalsFor - b.goalsAgainst;
              if (gdA !== gdB) return gdB - gdA;
              return b.goalsFor - a.goalsFor;
          });
          
          const playerStats = table.find(t => t.team.id === prevState.playerTeam!.id);

          if (playerStats && playerStats.matchesPlayed >= TOTAL_LEAGUE_MATCHES) {
             return { ...prevState, status: 'victory', winner: 'player', leagueTable: table };
          } else {
             return {
                 ...prevState,
                 status: 'leagueTable',
                 leagueTable: table,
                 scorePlayer: 0, scoreAI: 0, timeLeft: HALF_DURATION
             };
          }
      }

      // World Cup Mode
      if (winner === 'player') {
          if (prevState.tournamentRound >= 3) {
              return { ...prevState, status: 'victory', winner: 'player' };
          } else {
              const nextOpponent = getRandomOpponent('worldcup', prevState.playerTeam!.id);
              return { 
                  ...prevState, 
                  status: 'nextLevel', 
                  tournamentRound: prevState.tournamentRound + 1,
                  aiTeam: nextOpponent,
                  scorePlayer: 0, 
                  scoreAI: 0, 
                  winner: null, 
                  ballsPlayed: 1, 
                  timeLeft: HALF_DURATION,
              };
          }
      } else if (winner === 'draw') {
          // DRAW IN WORLD CUP -> GO TO PENALTIES
          return {
              ...prevState,
              status: 'playing',
              mode: 'penalties',
              previousMode: 'worldcup',
              scorePlayer: 0,
              scoreAI: 0,
              ballsPlayed: 1,
              penaltyTurn: 'player',
              winner: null,
              penaltyResults: {
                player: Array(TOTAL_PENALTIES).fill('pending'),
                ai: Array(TOTAL_PENALTIES).fill('pending')
              }
          };
      } else { // AI Won
          return { ...prevState, status: 'gameover', winner: 'ai' };
      }
  };

  const startModeSelection = (mode: GameMode) => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedGame(false);

    if (mode === 'arcade') {
        setGameState({
          status: 'playing',
          mode: 'arcade',
          scorePlayer: 0, scoreAI: 0, ballsPlayed: 1, timeLeft: HALF_DURATION, half: 1, winner: null, tournamentRound: 0
        });
    } else if (mode === 'penalties') {
        setGameState({
          status: 'playing',
          mode: 'penalties',
          scorePlayer: 0, scoreAI: 0, ballsPlayed: 1, timeLeft: HALF_DURATION, half: 1, winner: null, tournamentRound: 0, penaltyTurn: 'player',
          penaltyResults: {
            player: Array(TOTAL_PENALTIES).fill('pending'),
            ai: Array(TOTAL_PENALTIES).fill('pending')
          }
        });
    } else if (mode === 'league') {
        const initialTable: LeagueStats[] = LEAGUE_TEAMS.map(team => ({
            team: team, points: 0, goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0
        }));
        setGameState({
            status: 'teamSelect',
            mode: 'league',
            leagueTable: initialTable,
            scorePlayer: 0, scoreAI: 0, ballsPlayed: 1, timeLeft: HALF_DURATION, half: 1, winner: null, tournamentRound: 0
        });
    } else if (mode === 'worldcup') {
       setGameState({
          status: 'teamSelect',
          mode: 'worldcup',
          scorePlayer: 0, scoreAI: 0, ballsPlayed: 1, timeLeft: HALF_DURATION, half: 1, winner: null, tournamentRound: 0
       });
    }
  };

  const loadSavedGame = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGameState(JSON.parse(saved));
      } catch(e) { console.error(e); }
    }
  };
  
  // FIX: Added explicit GameState return type to prevent TypeScript from widening the 'status' property to 'string'.
  const processPenaltyShot = (prevState: GameState, goalScored: boolean): GameState => {
    const isPlayerShooting = prevState.penaltyTurn === 'player';
    
    let newScorePlayer = prevState.scorePlayer;
    let newScoreAI = prevState.scoreAI;

    if (goalScored) {
        if (isPlayerShooting) newScorePlayer++;
        else newScoreAI++;
    }

    const nextTurn = isPlayerShooting ? 'ai' : 'player';
    const ballsTaken = prevState.ballsPlayed;
    const nextBall = ballsTaken + 1;

    const shotsTakenPlayer = Math.ceil(ballsTaken / 2);
    const shotsTakenAI = Math.floor(ballsTaken / 2);
    
    const newPenaltyResults = {
      player: [...(prevState.penaltyResults?.player || Array(TOTAL_PENALTIES).fill('pending'))],
      ai: [...(prevState.penaltyResults?.ai || Array(TOTAL_PENALTIES).fill('pending'))],
    };
    
    const shotIndex = isPlayerShooting ? shotsTakenPlayer - 1 : shotsTakenAI - 1;

    if (shotIndex < TOTAL_PENALTIES) {
      if (isPlayerShooting) {
        newPenaltyResults.player[shotIndex] = goalScored ? 'goal' : 'miss';
      } else {
        newPenaltyResults.ai[shotIndex] = goalScored ? 'goal' : 'miss';
      }
    }

    let winner: 'player' | 'ai' | null = null;
    
    // Check for win condition only if not already decided
    if (!prevState.winner) {
      if (ballsTaken < TOTAL_PENALTIES * 2) {
          const remainingPlayer = TOTAL_PENALTIES - shotsTakenPlayer;
          const remainingAI = TOTAL_PENALTIES - shotsTakenAI;
          
          if (newScorePlayer > newScoreAI + remainingAI) winner = 'player';
          if (newScoreAI > newScorePlayer + remainingPlayer) winner = 'ai';
      }
      
      if (!winner && ballsTaken >= TOTAL_PENALTIES * 2 -1) { // End of 5 rounds or sudden death
          if (shotsTakenPlayer === shotsTakenAI || !isPlayerShooting) { // Check only after AI has taken their shot in a round
              if (newScorePlayer > newScoreAI) winner = 'player';
              else if (newScoreAI > newScorePlayer) winner = 'ai';
          }
      }
    }

    if (winner) {
        return {
            ...prevState,
            scorePlayer: newScorePlayer,
            scoreAI: newScoreAI,
            ballsPlayed: nextBall,
            status: 'gameover',
            winner,
            penaltyResults: newPenaltyResults,
        };
    } else {
        return {
            ...prevState,
            scorePlayer: newScorePlayer,
            scoreAI: newScoreAI,
            ballsPlayed: nextBall,
            penaltyTurn: nextTurn,
            penaltyResults: newPenaltyResults,
        };
    }
};


  const handleGoal = (scorer: 'player' | 'ai') => {
    if (gameState.mode === 'penalties') {
      setGameState(prev => processPenaltyShot(prev, true));
    } else {
        // Normal Mode Goal
        setGameState(prev => {
            const newScorePlayer = scorer === 'player' ? prev.scorePlayer + 1 : prev.scorePlayer;
            const newScoreAI = scorer === 'ai' ? prev.scoreAI + 1 : prev.scoreAI;
            
            if (prev.mode === 'arcade') {
                if (prev.ballsPlayed >= TOTAL_BALLS) {
                   const winner = newScorePlayer > newScoreAI ? 'player' : 'ai';
                   // FIX: Explicitly type the new state to prevent TypeScript from widening the 'status' property to 'string'.
                   const nextState: GameState = { ...prev, scorePlayer: newScorePlayer, scoreAI: newScoreAI, status: 'gameover', winner };
                   return nextState;
                }
                return { ...prev, scorePlayer: newScorePlayer, scoreAI: newScoreAI, ballsPlayed: prev.ballsPlayed + 1 };
            }
            return { ...prev, scorePlayer: newScorePlayer, scoreAI: newScoreAI };
        });
    }
  };

  const handleMiss = () => {
      // Only used for penalties currently
      if (gameState.mode === 'penalties') {
        setGameState(prev => processPenaltyShot(prev, false));
      }
  };

  const renderMenu = () => (
    <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-col items-center min-h-full p-6">
        <div className="w-full max-w-4xl my-auto flex flex-col items-center">
          <div className="text-center mb-12 animate-fade-in shrink-0 mt-8 md:mt-0">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 font-display mb-4 drop-shadow-xl">
              FOOSBALL MASTER
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-light tracking-wide">La experiencia definitiva de futbolín arcade</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full shrink-0 pb-8">
            <div className="col-span-1 md:col-span-2">
                {hasSavedGame && (
                <button onClick={loadSavedGame} className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-emerald-400 p-4 rounded-xl flex items-center justify-center gap-3 transition-all mb-6 group">
                    <History className="group-hover:rotate-12 transition-transform" />
                    <span className="font-bold text-lg">CONTINUAR PARTIDA</span>
                </button>
                )}
            </div>

            <button onClick={() => startModeSelection('arcade')} className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={100} /></div>
              <h2 className="text-3xl font-display font-bold mb-2 flex items-center gap-2"><Zap /> ARCADE</h2>
              <p className="text-blue-100/80">Partida rápida. El mejor de 10 bolas gana.</p>
            </button>

            <button onClick={() => startModeSelection('worldcup')} className="bg-gradient-to-br from-purple-600 to-indigo-800 p-8 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Globe2 size={100} /></div>
              <h2 className="text-3xl font-display font-bold mb-2 flex items-center gap-2"><Globe2 /> MUNDIAL</h2>
              <p className="text-indigo-100/80">Torneo de eliminación directa. Lleva a tu país a la gloria.</p>
            </button>

            <button onClick={() => startModeSelection('league')} className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Trophy size={100} /></div>
              <h2 className="text-3xl font-display font-bold mb-2 flex items-center gap-2"><Trophy /> LIGA</h2>
              <p className="text-emerald-100/80">Temporada completa. Suma puntos y gana el campeonato.</p>
            </button>

            <button onClick={() => startModeSelection('penalties')} className="bg-gradient-to-br from-orange-600 to-red-800 p-8 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={100} /></div>
              <h2 className="text-3xl font-display font-bold mb-2 flex items-center gap-2"><Target /> PENALES</h2>
              <p className="text-orange-100/80">Duelo tenso 1 contra 1. Demuestra tu precisión.</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white select-none">
      {gameState.status === 'menu' && renderMenu()}

      {gameState.status === 'playing' && (
        <div className="flex flex-col items-center p-2 min-h-screen">
          {/* Header */}
          <div className="w-full max-w-[800px] flex justify-between items-center mb-2 px-4 bg-slate-800/80 rounded-xl py-3 border border-slate-700 shadow-lg">
             <div className="flex flex-col items-start">
                 <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">
                    {gameState.playerTeam ? gameState.playerTeam.name : 'JUGADOR'}
                 </span>
                 <span className="text-4xl font-display text-blue-400">{gameState.scorePlayer}</span>
             </div>
             
             <div className="flex flex-col items-center">
                 {gameState.mode === 'arcade' ? (
                     <div className="bg-slate-900 px-4 py-1 rounded-full border border-slate-700">
                        <span className="text-slate-300 font-mono text-sm">BOLA {gameState.ballsPlayed} / {TOTAL_BALLS}</span>
                     </div>
                 ) : gameState.mode === 'penalties' ? (
                     <div className="bg-slate-900 px-4 py-1 rounded-full border border-slate-700">
                        <span className="text-orange-400 font-mono text-sm font-bold animate-pulse">
                           {gameState.penaltyTurn === 'player' ? 'TIRA JUGADOR' : 'TIRA CPU'}
                        </span>
                     </div>
                 ) : (
                     <div className="bg-slate-900 px-4 py-1 rounded-full border border-slate-700 flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-white font-mono text-xl">
                            {Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                     </div>
                 )}
             </div>

             <div className="flex flex-col items-end">
                 <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">
                    {gameState.aiTeam ? gameState.aiTeam.name : 'CPU'}
                 </span>
                 <span className="text-4xl font-display text-red-400">{gameState.scoreAI}</span>
             </div>
          </div>

          <GameCanvas 
             gameState={gameState} 
             setGameState={setGameState}
             onGoal={handleGoal}
             onMiss={handleMiss}
             registerActions={(actions) => gameActionsRef.current = actions}
          />
          
          <Controls 
            visible={gameState.mode !== 'penalties'} // HIDE CONTROLS IN PENALTY MODE
            onKickDefense={() => gameActionsRef.current?.kickDefense()}
            onKickAttack={() => gameActionsRef.current?.kickAttack()}
            onMoveDefense={(y) => gameActionsRef.current?.moveDefense(y)}
            onMoveAttack={(y) => gameActionsRef.current?.moveAttack(y)}
          />
          
          <div className="mt-4 flex gap-4">
             <button onClick={() => setGameState({...gameState, status: 'menu'})} className="text-slate-500 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors">
                Abandonar Partida
             </button>
          </div>
        </div>
      )}

      {(gameState.status === 'gameover' || gameState.status === 'victory') && (
        <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-8 animate-fade-in">
             <Crown size={80} className={`mb-6 ${gameState.winner === 'player' ? 'text-yellow-400' : 'text-slate-600'}`} />
             <h2 className="text-6xl font-display font-black mb-4 text-center">
                 {gameState.winner === 'player' ? '¡VICTORIA!' : gameState.winner === 'draw' ? '¡EMPATE!' : 'DERROTA'}
             </h2>
             <p className="text-2xl text-slate-400 mb-12">
                 {gameState.scorePlayer} - {gameState.scoreAI}
             </p>
             <button onClick={() => setGameState({...gameState, status: 'menu'})} className="bg-white text-slate-900 font-bold px-8 py-4 rounded-full text-xl hover:scale-105 transition-transform">
                 VOLVER AL MENÚ
             </button>
        </div>
      )}

      {/* Team Selection Screen */}
      {gameState.status === 'teamSelect' && (
        <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-slate-900">
           <div className="min-h-full flex flex-col items-center p-6">
            <h2 className="text-3xl font-display text-white mb-8 mt-4">Elige tu Equipo</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl">
                {(gameState.mode === 'league' ? LEAGUE_TEAMS : WORLD_CUP_TEAMS).map(team => (
                    <button 
                        key={team.id}
                        onClick={() => {
                            const playerTeam = team;
                            const aiTeam = getRandomOpponent(gameState.mode, team.id);
                            setGameState({
                                ...gameState,
                                playerTeam,
                                aiTeam,
                                status: gameState.mode === 'league' ? 'leagueTable' : 'playing'
                            });
                        }}
                        className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-750 transition-all group flex flex-col items-center gap-2"
                    >
                        <div className="w-12 h-12 rounded-full shadow-lg border-2 border-white/20 group-hover:scale-110 transition-transform" style={{backgroundColor: team.primaryColor}}></div>
                        <span className="font-bold text-sm">{team.name}</span>
                    </button>
                ))}
            </div>
            <button onClick={() => setGameState({...gameState, status: 'menu'})} className="mt-8 mb-4 text-slate-500 hover:text-white">Cancelar</button>
           </div>
        </div>
      )}
      
      {gameState.status === 'nextLevel' && gameState.playerTeam && gameState.aiTeam && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-fade-in">
              <Trophy size={80} className="mb-6 text-amber-400 drop-shadow-lg" />
              <h2 className="text-5xl font-display font-black mb-2 text-center text-white">
                  ¡RONDA SUPERADA!
              </h2>
              <p className="text-xl text-slate-300 mb-10">
                  Avanzas a la siguiente fase: <span className="font-bold text-white">{ROUND_NAMES[gameState.tournamentRound]}</span>
              </p>

              <div className="flex items-center justify-around w-full max-w-md mb-10">
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-24 h-24 rounded-full border-4 border-white/50 shadow-lg" style={{ backgroundColor: gameState.playerTeam.primaryColor }}></div>
                      <span className="font-bold text-lg">{gameState.playerTeam.name}</span>
                  </div>
                  <span className="text-4xl font-display text-slate-500">VS</span>
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-24 h-24 rounded-full border-4 border-white/20 shadow-lg" style={{ backgroundColor: gameState.aiTeam.primaryColor }}></div>
                      <span className="font-bold text-lg">{gameState.aiTeam.name}</span>
                  </div>
              </div>

              <button 
                  onClick={() => setGameState(prev => ({ ...prev, status: 'playing' }))}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xl py-4 px-12 rounded-xl shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                  JUGAR PARTIDO <ChevronRight />
              </button>
          </div>
      )}

      {/* League Table Screen */}
      {gameState.status === 'leagueTable' && gameState.leagueTable && (
          <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-slate-900">
             <div className="min-h-full flex flex-col items-center p-6">
              <div className="w-full max-w-2xl bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 my-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-display flex items-center gap-2"><ListOrdered /> CLASIFICACIÓN</h2>
                      <span className="text-slate-400 text-sm">Jornada {(gameState.leagueTable.find(t => t.team.id === gameState.playerTeam?.id)?.matchesPlayed || 0) + 1} de {TOTAL_LEAGUE_MATCHES}</span>
                  </div>
                  <div className="space-y-2">
                      <div className="grid grid-cols-12 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2 mb-2 px-2">
                          <div className="col-span-1">#</div>
                          <div className="col-span-5">Equipo</div>
                          <div className="col-span-2 text-center">PJ</div>
                          <div className="col-span-2 text-center">DG</div>
                          <div className="col-span-2 text-center text-white">PTS</div>
                      </div>
                      {gameState.leagueTable.map((row, i) => (
                          <div key={row.team.id} className={`grid grid-cols-12 items-center p-2 rounded-lg ${row.team.id === gameState.playerTeam?.id ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-slate-700/50'}`}>
                              <div className="col-span-1 font-mono text-slate-400">{i+1}</div>
                              <div className="col-span-5 flex items-center gap-3 font-bold">
                                  <div className="w-6 h-6 rounded-full border border-white/10" style={{backgroundColor: row.team.primaryColor}}></div>
                                  {row.team.name}
                              </div>
                              <div className="col-span-2 text-center text-slate-400">{row.matchesPlayed}</div>
                              <div className="col-span-2 text-center text-slate-400 text-xs">{row.goalsFor - row.goalsAgainst}</div>
                              <div className="col-span-2 text-center font-bold text-lg">{row.points}</div>
                          </div>
                      ))}
                  </div>
                  <button 
                      onClick={() => {
                          // Find next opponent for league match
                          const playerStats = gameState.leagueTable!.find(s => s.team.id === gameState.playerTeam!.id)!;
                          const playedOpponents = new Set(JSON.parse(localStorage.getItem(`played_${gameState.playerTeam!.id}`) || '[]'));
                          
                          const availableOpponents = LEAGUE_TEAMS.filter(t => t.id !== gameState.playerTeam!.id && !playedOpponents.has(t.id));
                          
                          let nextOpponent;
                          if (availableOpponents.length > 0) {
                             nextOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
                             playedOpponents.add(nextOpponent.id);
                             localStorage.setItem(`played_${gameState.playerTeam!.id}`, JSON.stringify(Array.from(playedOpponents)));
                          } else {
                            // Reset if all opponents played
                            localStorage.removeItem(`played_${gameState.playerTeam!.id}`);
                            nextOpponent = getRandomOpponent('league', gameState.playerTeam!.id);
                          }

                          setGameState({
                              ...gameState, 
                              status: 'playing',
                              aiTeam: nextOpponent
                          })
                      }}
                      className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/50"
                  >
                      <PlayCircle /> JUGAR SIGUIENTE PARTIDO
                  </button>
              </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;
