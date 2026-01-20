



import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  BALL_RADIUS, 
  FRICTION, 
  WALL_BOUNCE, 
  PLAYER_REACH, 
  ROD_THICKNESS, 
  COLOR_FIELD,
  COLOR_FIELD_DARK,
  COLOR_LINES,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  KICK_FORCE,
  GOAL_SIZE,
  AUTO_MOVE_SPEED,
  COLOR_PLAYER_TEAM,
  COLOR_AI_TEAM,
  TOTAL_PENALTIES
} from '../constants';
import { Ball, Rod, GameState, PenaltyResult } from '../types';
import { ArrowRight, ArrowUp, Zap, Shield, ChevronRight, Eye, Target } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onGoal: (scorer: 'player' | 'ai') => void;
  onMiss?: () => void;
  registerActions: (actions: { 
    kickDefense: () => void; 
    kickAttack: () => void;
    moveDefense: (y: number | null) => void;
    moveAttack: (y: number | null) => void;
  }) => void;
}

type PenaltyPhase = 'aiming' | 'kicking' | 'celebration';
type Direction = 'left' | 'center' | 'right';
type Power = 'soft' | 'medium' | 'strong';

const PenaltyScoreIcon: React.FC<{ status: PenaltyResult }> = ({ status }) => {
    const baseClass = "w-5 h-5 md:w-6 md:h-6 rounded-full transition-all duration-300";
    if (status === 'goal') return <div className={`${baseClass} bg-emerald-400 shadow-lg scale-110 ring-2 ring-white/50`} />;
    if (status === 'miss') return <div className={`${baseClass} bg-red-500 shadow-lg scale-110 ring-2 ring-white/50`} />;
    return <div className={`${baseClass} bg-slate-700 border-2 border-slate-500`} />;
};

const PenaltyScoreboard: React.FC<{ results: GameState['penaltyResults'], playerTeam: GameState['playerTeam'], aiTeam: GameState['aiTeam'] }> = ({ results, playerTeam, aiTeam }) => {
    if (!results) return null;
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-[280px] z-20 bg-black/50 backdrop-blur-sm p-2 rounded-xl border border-white/10">
            <div className="flex justify-between items-center px-2">
                <span className="text-sm font-bold text-blue-300 w-12">{playerTeam?.code || 'JUG'}</span>
                <div className="flex gap-2">
                    {results.player.map((r, i) => <PenaltyScoreIcon key={`p-${i}`} status={r} />)}
                </div>
            </div>
            <div className="flex justify-between items-center px-2 mt-1">
                <span className="text-sm font-bold text-red-300 w-12">{aiTeam?.code || 'CPU'}</span>
                <div className="flex gap-2">
                    {results.ai.map((r, i) => <PenaltyScoreIcon key={`ai-${i}`} status={r} />)}
                </div>
            </div>
        </div>
    );
};


export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onGoal, onMiss, registerActions }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Penalty Logic State
  const [penaltyPhase, setPenaltyPhase] = useState<PenaltyPhase>('aiming');
  const [selectedDir, setSelectedDir] = useState<Direction>('center');
  const [selectedPower, setSelectedPower] = useState<Power>('medium');
  const [goaliePrediction, setGoaliePrediction] = useState<Direction>('center'); 
  const [isAiShooting, setIsAiShooting] = useState(false);
  
  const [goalOverlay, setGoalOverlay] = useState<{ visible: boolean; scorer: 'player' | 'ai' | null | 'miss' }>({ 
    visible: false, 
    scorer: null 
  });
  
  const ballRef = useRef<Ball>({
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: BALL_RADIUS
  });

  const shakeFramesRef = useRef<number>(0);
  const stuckFramesRef = useRef<number>(0); 
  const isGoalScoredRef = useRef(false);
  const lastSoundTimeRef = useRef<number>(0);
  
  const manualControlsRef = useRef<{
    defense: number | null;
    attack: number | null;
  }>({ defense: null, attack: null });

  const rodsRef = useRef<Rod[]>([
    { id: 0, isPlayer: true, role: 'goalie', x: 50, y: 0, targetY: 0, players: [{ offsetY: 0, color: COLOR_PLAYER_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 1, isPlayer: true, role: 'defense', x: 140, y: 0, targetY: 0, players: [{ offsetY: -100, color: COLOR_PLAYER_TEAM }, { offsetY: 100, color: COLOR_PLAYER_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 2, isPlayer: false, role: 'attack', x: 230, y: 0, targetY: 0, players: [{ offsetY: 0, color: COLOR_AI_TEAM }, { offsetY: -120, color: COLOR_AI_TEAM }, { offsetY: 120, color: COLOR_AI_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 3, isPlayer: true, role: 'midfield', x: 320, y: 0, targetY: 0, players: [{ offsetY: -100, color: COLOR_PLAYER_TEAM }, { offsetY: 0, color: COLOR_PLAYER_TEAM }, { offsetY: 100, color: COLOR_PLAYER_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 4, isPlayer: false, role: 'midfield', x: 480, y: 0, targetY: 0, players: [{ offsetY: -100, color: COLOR_AI_TEAM }, { offsetY: 0, color: COLOR_AI_TEAM }, { offsetY: 100, color: COLOR_AI_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 5, isPlayer: true, role: 'attack', x: 570, y: 0, targetY: 0, players: [{ offsetY: 0, color: COLOR_PLAYER_TEAM }, { offsetY: -120, color: COLOR_PLAYER_TEAM }, { offsetY: 120, color: COLOR_PLAYER_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 6, isPlayer: false, role: 'defense', x: 660, y: 0, targetY: 0, players: [{ offsetY: -100, color: COLOR_AI_TEAM }, { offsetY: 100, color: COLOR_AI_TEAM }], isSpinning: false, spinAngle: 0 },
    { id: 7, isPlayer: false, role: 'goalie', x: 750, y: 0, targetY: 0, players: [{ offsetY: 0, color: COLOR_AI_TEAM }], isSpinning: false, spinAngle: 0 }
  ]);
  
  const isRodActive = useCallback((rod: Rod) => {
    if (gameState.mode === 'penalties') {
      const isPlayerTurn = gameState.penaltyTurn === 'player';
      if (isPlayerTurn) return rod.id === 3 || rod.id === 7;
      else return rod.id === 4 || rod.id === 0;
    }
    return true;
  }, [gameState.mode, gameState.penaltyTurn]);
  
  useEffect(() => {
    if (gameState.mode === 'penalties' && gameState.penaltyTurn === 'player' && penaltyPhase === 'aiming') {
      const interval = setInterval(() => {
         const dirs: Direction[] = ['left', 'center', 'right'];
         setGoaliePrediction(dirs[Math.floor(Math.random() * 3)]);
      }, 700); 
      return () => clearInterval(interval);
    }
  }, [gameState.mode, gameState.penaltyTurn, penaltyPhase]);

  const resetPenaltyPositions = useCallback(() => {
     setPenaltyPhase('aiming');
     setSelectedDir('center');
     setSelectedPower('medium');
     setGoaliePrediction('center');
     setIsAiShooting(false);
     stuckFramesRef.current = 0;
     rodsRef.current.forEach(r => { r.y = 0; r.spinAngle = 0; r.isSpinning = false; r.targetY = 0; });
     const centerY = CANVAS_HEIGHT / 2;
     if (gameState.penaltyTurn === 'player') ballRef.current.pos = { x: 320 + PLAYER_REACH + 15, y: centerY };
     else ballRef.current.pos = { x: 480 - PLAYER_REACH - 15, y: centerY };
     ballRef.current.vel = { x: 0, y: 0 }; ballRef.current.radius = BALL_RADIUS;
     isGoalScoredRef.current = false;
  }, [gameState.penaltyTurn]);
  
  useEffect(() => {
      isGoalScoredRef.current = false;
      if (gameState.mode === 'penalties') resetPenaltyPositions();
      else {
          ballRef.current.pos = { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2 };
          ballRef.current.vel = { x: 0, y: 0 };
          setPenaltyPhase('aiming');
          stuckFramesRef.current = 0;
      }
  }, [gameState.mode, gameState.ballsPlayed, gameState.scorePlayer, gameState.scoreAI, gameState.penaltyTurn, resetPenaltyPositions]);

  const startPenaltySequence = () => {
    playWhistleSound();
    if (gameState.penaltyTurn === 'player') {
        setTimeout(executePenalty, 200);
    } else {
        setIsAiShooting(true);
        setTimeout(() => {
            executePenalty();
            setIsAiShooting(false);
        }, 1400);
    }
  };

  const executePenalty = () => {
      setPenaltyPhase('kicking');
      playKickSound();
      shakeFramesRef.current = 5;
      const isPlayerTurn = gameState.penaltyTurn === 'player';
      let kickDir: Direction = selectedDir, kickPower: Power = selectedPower, defendDir: Direction = goaliePrediction;

      if (!isPlayerTurn) {
          const dirs: Direction[] = ['left', 'center', 'right']; const powers: Power[] = ['soft', 'medium', 'strong'];
          kickDir = dirs[Math.floor(Math.random() * 3)]; kickPower = powers[Math.floor(Math.random() * 3)];
          defendDir = selectedDir;
      }
      
      const kickerId = isPlayerTurn ? 3 : 4;
      const kickerRod = rodsRef.current.find(r => r.id === kickerId);
      if (kickerRod) kickerRod.isSpinning = true;

      const powerMap = { soft: 6, medium: 9, strong: 14 }; const speed = powerMap[kickPower];
      const directionX = isPlayerTurn ? 1 : -1;
      let vy = 0;
      if (kickDir === 'left') vy = -speed * 0.35; 
      if (kickDir === 'right') vy = speed * 0.35; 
      vy += (Math.random() - 0.5); 
      ballRef.current.vel = { x: speed * directionX, y: vy };

      const goalieId = isPlayerTurn ? 7 : 0;
      const goalieRod = rodsRef.current.find(r => r.id === goalieId);
      if (goalieRod) {
          let targetY = 0; const limit = (CANVAS_HEIGHT / 2) - 50;
          if (defendDir === 'left') targetY = -limit; 
          if (defendDir === 'right') targetY = limit; 
          goalieRod.targetY = targetY;
      }
  };
  
  useEffect(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    }
  }, []);

  const playSound = useCallback((type: 'kick' | 'goal' | 'thump' | 'whistle' | 'save') => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx.currentTime - lastSoundTimeRef.current < 0.05) return;
      lastSoundTimeRef.current = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      
      switch(type) {
          case 'kick':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(120, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
              gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
              osc.start(); osc.stop(ctx.currentTime + 0.1);
              break;
          case 'goal':
              const osc2 = ctx.createOscillator();
              osc2.connect(gainNode);
              osc.type = 'square'; osc2.type = 'square';
              osc.frequency.setValueAtTime(2000, ctx.currentTime);
              osc2.frequency.setValueAtTime(2100, ctx.currentTime);
              gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
              gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
              osc.start(); osc.stop(ctx.currentTime + 0.8);
              osc2.start(); osc2.stop(ctx.currentTime + 0.8);
              break;
          case 'thump':
              osc.type = 'sine';
              osc.frequency.setValueAtTime(80, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
              gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
              osc.start(); osc.stop(ctx.currentTime + 0.15);
              break;
          case 'whistle':
              osc.type = 'sine';
              osc.frequency.setValueAtTime(3000, ctx.currentTime);
              osc.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 0.2);
              gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
              osc.start(); osc.stop(ctx.currentTime + 0.2);
              break;
          case 'save':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(100, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
              gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
              osc.start(); osc.stop(ctx.currentTime + 0.1);
              break;
      }
  }, []);
  
  const playKickSound = useCallback(() => playSound('kick'), [playSound]);
  const playGoalSound = useCallback(() => playSound('goal'), [playSound]);
  const playThumpSound = useCallback(() => playSound('thump'), [playSound]);
  const playWhistleSound = useCallback(() => playSound('whistle'), [playSound]);
  const playSaveSound = useCallback(() => playSound('save'), [playSound]);

  useEffect(() => {
    const playerColor = gameState.playerTeam ? gameState.playerTeam.primaryColor : COLOR_PLAYER_TEAM;
    const aiColor = gameState.aiTeam ? gameState.aiTeam.primaryColor : COLOR_AI_TEAM;
    rodsRef.current.forEach(rod => {
      rod.players.forEach(p => { p.color = rod.isPlayer ? playerColor : aiColor; });
    });
  }, [gameState.playerTeam, gameState.aiTeam]);
  
  useEffect(() => {
    registerActions({
      kickDefense: () => { if (gameState.mode !== 'penalties') rodsRef.current.filter(r => r.id === 0 || r.id === 1).forEach(r => { r.isSpinning = true; r.spinAngle = 0; }); },
      kickAttack: () => { if (gameState.mode !== 'penalties') rodsRef.current.filter(r => r.id === 3 || r.id === 5).forEach(r => { r.isSpinning = true; r.spinAngle = 0; }); },
      moveDefense: (y) => { manualControlsRef.current.defense = y; },
      moveAttack: (y) => { manualControlsRef.current.attack = y; }
    });
  }, [gameState.mode, registerActions]);
  
  const handleResult = (type: 'goal_player' | 'goal_ai' | 'miss') => {
      if (isGoalScoredRef.current) return;
      isGoalScoredRef.current = true;
      setPenaltyPhase('celebration');

      if (type === 'miss') {
          setGoalOverlay({ visible: true, scorer: 'miss' });
          if (onMiss) setTimeout(() => { onMiss(); setGoalOverlay({visible:false, scorer:null}); }, 2000);
      } else {
          const scorer = type === 'goal_player' ? 'player' : 'ai';
          playGoalSound();
          setGoalOverlay({ visible: true, scorer });
          setTimeout(() => { onGoal(scorer); setGoalOverlay({visible:false, scorer:null}); }, 2000);
      }
  };

  const updatePenaltyPhysics = () => {
      const ball = ballRef.current;
      ball.pos.x += ball.vel.x; ball.pos.y += ball.vel.y;
      ball.vel.x *= FRICTION; ball.vel.y *= FRICTION;

      rodsRef.current.forEach(rod => {
          if (rod.isSpinning) {
              rod.spinAngle += 0.4;
              if (rod.spinAngle > Math.PI*2) { rod.spinAngle = 0; rod.isSpinning = false; }
          }
      });

      const isPlayerTurn = gameState.penaltyTurn === 'player';
      const goalieId = isPlayerTurn ? 7 : 0;
      const goalieRod = rodsRef.current.find(r => r.id === goalieId);
      if (goalieRod) {
          goalieRod.y += (goalieRod.targetY - goalieRod.y) * 0.4; 
          goalieRod.players.forEach(p => {
              const px = goalieRod.x; const py = (CANVAS_HEIGHT / 2) + goalieRod.y + p.offsetY;
              const dx = ball.pos.x - px; const dy = ball.pos.y - py;
              if (Math.sqrt(dx * dx + dy * dy) < PLAYER_REACH + ball.radius) {
                  ball.vel.x *= -0.5; ball.vel.y *= 0.5;
                  playSaveSound();
                  shakeFramesRef.current = 8;
                  ball.pos.x = isPlayerTurn ? px - PLAYER_REACH - 15 : px + PLAYER_REACH + 15;
              }
          });
      }

      const speed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);
      if (speed < 0.1 && !isGoalScoredRef.current) handleResult('miss');
      if (ball.pos.y - ball.radius < 0 || ball.pos.y + ball.radius > CANVAS_HEIGHT) {
          ball.vel.y *= -WALL_BOUNCE;
          ball.pos.y = ball.pos.y < 0 ? ball.radius : CANVAS_HEIGHT - ball.radius;
      }
      const goalTop = CANVAS_HEIGHT / 2 - GOAL_SIZE / 2;
      const goalBottom = CANVAS_HEIGHT / 2 + GOAL_SIZE / 2;
      if (ball.pos.x < 0) {
          if (ball.pos.y > goalTop && ball.pos.y < goalBottom) handleResult('goal_ai'); else handleResult('miss');
      } else if (ball.pos.x > CANVAS_WIDTH) {
          if (ball.pos.y > goalTop && ball.pos.y < goalBottom) handleResult('goal_player'); else handleResult('miss');
      }
  };

  const updateNormalPhysics = () => {
    const ball = ballRef.current;
    ball.pos.x += ball.vel.x; ball.pos.y += ball.vel.y;
    ball.vel.x *= FRICTION; ball.vel.y *= FRICTION;
    if (ball.pos.y - ball.radius < 0) { ball.pos.y = ball.radius; ball.vel.y *= -WALL_BOUNCE; }
    else if (ball.pos.y + ball.radius > CANVAS_HEIGHT) { ball.pos.y = CANVAS_HEIGHT - ball.radius; ball.vel.y *= -WALL_BOUNCE; }
    const goalTop = CANVAS_HEIGHT/2 - GOAL_SIZE/2;
    const goalBottom = CANVAS_HEIGHT/2 + GOAL_SIZE/2;
    if (ball.pos.x < 0) {
        if (ball.pos.y > goalTop && ball.pos.y < goalBottom) handleResult('goal_ai'); else { ball.pos.x = ball.radius; ball.vel.x *= -WALL_BOUNCE; }
    } else if (ball.pos.x > CANVAS_WIDTH) {
        if (ball.pos.y > goalTop && ball.pos.y < goalBottom) handleResult('goal_player'); else { ball.pos.x = CANVAS_WIDTH - ball.radius; ball.vel.x *= -WALL_BOUNCE; }
    }
    
    const speed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);
    if (speed < 0.2 && !isGoalScoredRef.current) {
        const isReachable = rodsRef.current.some(rod => Math.abs(ball.pos.x - rod.x) < (PLAYER_REACH + ball.radius + 10) );
        if (!isReachable) {
             stuckFramesRef.current++;
             if (stuckFramesRef.current > 60) {
                 playThumpSound(); shakeFramesRef.current = 15;
                 ball.vel.x += (Math.random() - 0.5) * 5;
                 ball.vel.y += (Math.random() - 0.5) * 5;
                 stuckFramesRef.current = 0;
             }
        } else stuckFramesRef.current = 0;
    } else stuckFramesRef.current = 0;

    rodsRef.current.forEach(rod => {
        if (!isRodActive(rod)) return;
        if (rod.isPlayer) {
           let targetY = 0;
           if (rod.role === 'goalie' || rod.role === 'defense') targetY = (manualControlsRef.current.defense ?? 0) * (CANVAS_HEIGHT/2 - 30);
           if (rod.role === 'midfield' || rod.role === 'attack') targetY = (manualControlsRef.current.attack ?? 0) * (CANVAS_HEIGHT/2 - 30);
           rod.y += (targetY - rod.y) * 0.5;
        } else {
            let predictedY = ball.pos.y + (ball.vel.y * 15);
            if (predictedY < 0) predictedY = -predictedY;
            if (predictedY > CANVAS_HEIGHT) predictedY = CANVAS_HEIGHT - (predictedY - CANVAS_HEIGHT);
            const clampedPrediction = Math.max(0, Math.min(CANVAS_HEIGHT, predictedY));
            let bestOffset = 0, minDiff = 10000;
            rod.players.forEach(p => {
                const diff = clampedPrediction - (rod.y + CANVAS_HEIGHT/2 + p.offsetY);
                if (Math.abs(diff) < Math.abs(minDiff)) { minDiff = diff; bestOffset = p.offsetY; }
            });
            const distanceToBallX = Math.abs(ball.pos.x - rod.x);
            let dynamicSpeed = AUTO_MOVE_SPEED;
            if (distanceToBallX < 200) dynamicSpeed *= 2.0; if (distanceToBallX < 80) dynamicSpeed *= 1.5;
            rod.y += (clampedPrediction - CANVAS_HEIGHT/2 - bestOffset - rod.y) * dynamicSpeed;
            if (!rod.isSpinning && distanceToBallX < (PLAYER_REACH + 25)) {
                if (rod.players.some(p => Math.abs(ball.pos.y - (CANVAS_HEIGHT/2 + rod.y + p.offsetY)) < (PLAYER_HEIGHT * 0.8))) {
                     if (Math.random() < 0.4) rod.isSpinning = true;
                }
            }
        }
        
        if (rod.isSpinning) {
            rod.spinAngle += 0.45; if (rod.spinAngle > Math.PI*2) { rod.spinAngle = 0; rod.isSpinning = false; }
        }
        
        rod.players.forEach(p => {
            const px = rod.x; const py = CANVAS_HEIGHT/2 + rod.y + p.offsetY;
            const dx = ball.pos.x - px; const dy = ball.pos.y - py;
            if (Math.sqrt(dx*dx + dy*dy) < PLAYER_REACH + ball.radius) {
                playKickSound();
                if (rod.isSpinning) {
                    const dir = rod.isPlayer ? 1 : -1;
                    ball.vel.x = dir * KICK_FORCE; ball.vel.y = (dy/PLAYER_REACH) * 8 + (Math.random() - 0.5) * 2;
                    ball.pos.x = px + (dir * (PLAYER_REACH + ball.radius + 4));
                    shakeFramesRef.current = 5;
                } else {
                    if (Math.abs(dx) > Math.abs(dy)) {
                        ball.vel.x *= -0.6; ball.pos.x = px + ((dx > 0 ? 1 : -1) * (PLAYER_REACH + ball.radius + 1));
                    } else {
                        ball.vel.y *= -0.6; ball.pos.y = py + ((dy > 0 ? 1 : -1) * (PLAYER_REACH + ball.radius + 1));
                    }
                }
            }
        });
    });
  };

  const animate = useCallback(() => {
    if (gameState.status !== 'playing') {
       if (gameState.status === 'gameover') draw(canvasRef.current?.getContext('2d')!);
       requestRef.current = requestAnimationFrame(animate);
       return;
    }
    if (!isGoalScoredRef.current) {
        if (gameState.mode === 'penalties' && penaltyPhase !== 'aiming') updatePenaltyPhysics();
        else if (gameState.mode !== 'penalties') updateNormalPhysics();
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx);
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState.status, gameState.mode, penaltyPhase, isRodActive]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    if (shakeFramesRef.current > 0) {
        ctx.translate((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
        shakeFramesRef.current--;
    }
    ctx.fillStyle = COLOR_FIELD; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLOR_FIELD_DARK;
    for(let i=0; i<10; i+=2) ctx.fillRect(i * CANVAS_WIDTH/10, 0, CANVAS_WIDTH/10, CANVAS_HEIGHT);
    
    if (gameState.mode === 'penalties' && penaltyPhase === 'aiming') {
       const isPlayerTurn = gameState.penaltyTurn === 'player';
       const targetX = isPlayerTurn ? CANVAS_WIDTH - 20 : 20;
       let targetY = CANVAS_HEIGHT / 2;
       const activeDir = isPlayerTurn ? selectedDir : goaliePrediction;
       if (activeDir === 'left') targetY -= 60; if (activeDir === 'right') targetY += 60;
       ctx.strokeStyle = isPlayerTurn ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 0, 0, 0.5)';
       ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(targetX, targetY, 20, 0, Math.PI*2); ctx.stroke();
    }

    ctx.strokeStyle = COLOR_LINES; ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, CANVAS_WIDTH-100, CANVAS_HEIGHT-100);
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2, 50); ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT-50); ctx.stroke();
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 60, 0, Math.PI*2); ctx.stroke();
    const goalY = CANVAS_HEIGHT/2 - GOAL_SIZE/2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, goalY, 20, GOAL_SIZE); ctx.fillRect(CANVAS_WIDTH-20, goalY, 20, GOAL_SIZE);
    
    rodsRef.current.forEach(rod => {
        if (!isRodActive(rod)) return;
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(rod.x - ROD_THICKNESS/2, 0, ROD_THICKNESS, CANVAS_HEIGHT);
        rod.players.forEach(p => {
             const px = rod.x; const py = CANVAS_HEIGHT/2 + rod.y + p.offsetY;
             ctx.save(); ctx.translate(px, py);
             if (gameState.mode === 'penalties' && rod.role === 'goalie') {
                 let rotation = 0;
                 if (rod.targetY < -1) rotation = -Math.PI / 5; if (rod.targetY > 1) rotation = Math.PI / 5;
                 const completion = Math.min(1, Math.abs(rod.y - rod.targetY) / 50);
                 ctx.rotate(rotation * completion);
             }
             if (rod.isSpinning) ctx.rotate(rod.spinAngle * (rod.isPlayer ? 1 : -1));
             ctx.fillStyle = p.color;
             ctx.fillRect(-PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, PLAYER_WIDTH, PLAYER_HEIGHT);
             ctx.fillStyle = '#fce7f3'; ctx.beginPath(); ctx.arc(0, -PLAYER_HEIGHT/2, 6, 0, Math.PI*2); ctx.fill();
             ctx.restore();
        });
    });
    
    const b = ballRef.current;
    if (b && !isNaN(b.pos.x)) {
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI*2);
        ctx.fillStyle = 'white'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
    }
    ctx.restore();
  };

  return (
    <div className="relative shadow-2xl border-8 border-amber-800 rounded-lg overflow-hidden bg-green-900 mx-auto w-full max-w-[800px] touch-none">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block w-full h-auto" />
      
      {gameState.mode === 'penalties' && penaltyPhase === 'aiming' && !isAiShooting && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end items-center pointer-events-none">
             <PenaltyScoreboard results={gameState.penaltyResults} playerTeam={gameState.playerTeam} aiTeam={gameState.aiTeam} />
             <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90 pointer-events-none" />

             <div className="relative z-10 pointer-events-auto bg-slate-900/95 backdrop-blur-md w-full pb-4 pt-4 px-4 rounded-t-3xl border-t border-white/10 shadow-2xl animate-slide-up">
                  <div className="flex items-center justify-center gap-2 mb-4">
                      {gameState.penaltyTurn === 'player' ? <Zap className="text-yellow-400" /> : <Shield className="text-blue-400" />}
                      <h3 className="text-xl font-black italic text-white tracking-wider font-display">
                          {gameState.penaltyTurn === 'player' ? 'PENALTI: TU TURNO' : 'PENALTI: DEFIENDE'}
                      </h3>
                  </div>
                  
                  <div className="relative w-full max-w-sm mx-auto aspect-[2/1] bg-black/20 rounded-lg p-2 border border-white/10 mb-3 flex items-center justify-center">
                    <div className="w-full h-full border-4 border-slate-400 border-b-0 rounded-t-md"></div>
                    <div className="absolute inset-0 flex p-1 gap-1">
                        { (['left', 'center', 'right'] as Direction[]).map(dir => (
                            <button key={dir} onClick={() => setSelectedDir(dir)} className={`flex-1 rounded-md transition-colors duration-200 text-white font-bold text-sm flex items-center justify-center ${selectedDir === dir ? 'bg-white/20 backdrop-blur-sm' : 'hover:bg-white/10'}`}>
                                {dir.toUpperCase()}
                            </button>
                        ))}
                    </div>
                  </div>

                  {gameState.penaltyTurn === 'player' && (
                      <div className="w-full max-w-sm mx-auto flex gap-2 justify-center mb-3">
                          {(['soft', 'medium', 'strong'] as Power[]).map((p) => (
                              <button key={p} onClick={() => setSelectedPower(p)} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all border-b-4 ${selectedPower === p ? (p === 'strong' ? 'bg-red-500 border-red-700 text-white' : p === 'medium' ? 'bg-yellow-500 border-yellow-700 text-slate-800' : 'bg-green-500 border-green-700 text-white') : 'bg-slate-700 border-slate-800 text-slate-400 hover:bg-slate-600'}`}>
                                  {p === 'strong' ? 'FUERTE' : p === 'medium' ? 'NORMAL' : 'SUAVE'}
                              </button>
                          ))}
                      </div>
                  )}

                  <button onClick={startPenaltySequence} className="w-full max-w-sm mx-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-lg py-3 rounded-xl shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2">
                      {gameState.penaltyTurn === 'player' ? '¡DISPARAR!' : '¡PREPARAR!'} <ChevronRight />
                  </button>
             </div>
        </div>
      )}

      {isAiShooting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h2 className="text-3xl font-black italic text-white tracking-widest animate-pulse">CPU CHUTANDO...</h2>
              </div>
          </div>
      )}
      
      {goalOverlay.visible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="transform transition-transform duration-500 animate-bounce">
              <h2 className={`text-8xl font-black font-display italic tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] ${goalOverlay.scorer === 'player' ? 'text-cyan-400' : goalOverlay.scorer === 'miss' ? 'text-white' : 'text-rose-500'}`}>
                 {goalOverlay.scorer === 'player' ? '¡GOLAZO!' : goalOverlay.scorer === 'ai' ? '¡GOL CPU!' : '¡FALLÓ!'}
              </h2>
           </div>
        </div>
      )}
    </div>
  );
};
