
import { Team } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const TOTAL_BALLS = 10;
export const TOTAL_PENALTIES = 5;
export const HALF_DURATION = 180; // 3 minutes for single match
export const TOTAL_LEAGUE_MATCHES = 10;

// Physics
export const FRICTION = 0.994; // Less friction for faster ball
export const WALL_BOUNCE = 0.7;
export const MAX_SPEED = 16; // Increased max speed
export const KICK_FORCE = 18; // Stronger kicks
export const SPIN_SPEED = 0.45; // Faster rod spin
export const SPIN_DURATION = 15; // Frames

// Dimensions
export const PLAYER_WIDTH = 12;
export const PLAYER_HEIGHT = 30; // Radius of rotation effectively
export const PLAYER_REACH = 22; // Slightly larger hitbox for better contact
export const ROD_THICKNESS = 4;
export const BALL_RADIUS = 8;
export const GOAL_SIZE = 140;

// AI
export const AI_REACTION_SPEED = 0.12; // Faster reaction
export const AUTO_MOVE_SPEED = 0.12; // Much faster vertical movement (was 0.06)

// Colors
export const COLOR_FIELD = '#4ade80'; // green-400
export const COLOR_FIELD_DARK = '#22c55e'; // green-500
export const COLOR_LINES = 'rgba(255, 255, 255, 0.6)';

// Default Fallback Colors
export const COLOR_PLAYER_TEAM = '#3b82f6'; // blue-500
export const COLOR_AI_TEAM = '#ef4444'; // red-500

export const WORLD_CUP_TEAMS: Team[] = [
  { id: 'arg', name: 'Argentina', code: 'ARG', primaryColor: '#75AADB', secondaryColor: '#FFFFFF' },
  { id: 'bra', name: 'Brasil', code: 'BRA', primaryColor: '#FFDF00', secondaryColor: '#009C3B' },
  { id: 'fra', name: 'Francia', code: 'FRA', primaryColor: '#002395', secondaryColor: '#FFFFFF' },
  { id: 'ger', name: 'Alemania', code: 'GER', primaryColor: '#FFFFFF', secondaryColor: '#000000' },
  { id: 'esp', name: 'España', code: 'ESP', primaryColor: '#AA151B', secondaryColor: '#F1BF00' },
  { id: 'eng', name: 'Inglaterra', code: 'ENG', primaryColor: '#FFFFFF', secondaryColor: '#CE1124' },
  { id: 'ita', name: 'Italia', code: 'ITA', primaryColor: '#0064AA', secondaryColor: '#FFFFFF' },
  { id: 'ned', name: 'Holanda', code: 'NED', primaryColor: '#F36C21', secondaryColor: '#FFFFFF' },
  { id: 'por', name: 'Portugal', code: 'POR', primaryColor: '#E42518', secondaryColor: '#006600' },
  { id: 'bel', name: 'Bélgica', code: 'BEL', primaryColor: '#E30613', secondaryColor: '#FDF146' },
  { id: 'cro', name: 'Croacia', code: 'CRO', primaryColor: '#FFFFFF', secondaryColor: '#FF0000' },
  { id: 'uru', name: 'Uruguay', code: 'URU', primaryColor: '#5BA4D4', secondaryColor: '#000000' },
  { id: 'mex', name: 'México', code: 'MEX', primaryColor: '#006847', secondaryColor: '#FFFFFF' },
  { id: 'usa', name: 'USA', code: 'USA', primaryColor: '#3C3B6E', secondaryColor: '#B22234' },
  { id: 'jpn', name: 'Japón', code: 'JPN', primaryColor: '#000555', secondaryColor: '#FFFFFF' },
  { id: 'mar', name: 'Marruecos', code: 'MAR', primaryColor: '#C1272D', secondaryColor: '#006233' },
  { id: 'col', name: 'Colombia', code: 'COL', primaryColor: '#FCD116', secondaryColor: '#003893' },
  { id: 'chi', name: 'Chile', code: 'CHI', primaryColor: '#D52B1E', secondaryColor: '#0039A6' },
];

export const LEAGUE_TEAMS: Team[] = [
  { id: 'bar', name: 'Barcelona', code: 'BAR', primaryColor: '#A50044', secondaryColor: '#004D98' },
  { id: 'rma', name: 'Real Madrid', code: 'RMA', primaryColor: '#FFFFFF', secondaryColor: '#FEBE10' },
  { id: 'atl', name: 'Atlético', code: 'ATM', primaryColor: '#CB3524', secondaryColor: '#FFFFFF' },
  { id: 'osa', name: 'Osasuna', code: 'OSA', primaryColor: '#B40526', secondaryColor: '#172C59' },
  { id: 'lev', name: 'Levante', code: 'LEV', primaryColor: '#004996', secondaryColor: '#A61A2E' },
  { id: 'elc', name: 'Elche', code: 'ELC', primaryColor: '#009540', secondaryColor: '#FFFFFF' },
  { id: 'bet', name: 'Betis', code: 'BET', primaryColor: '#0BB363', secondaryColor: '#FFFFFF' },
  { id: 'rso', name: 'R. Sociedad', code: 'RSO', primaryColor: '#0067B1', secondaryColor: '#FFFFFF' },
  { id: 'sev', name: 'Sevilla', code: 'SEV', primaryColor: '#FFFFFF', secondaryColor: '#D4001F' },
  { id: 'vil', name: 'Villarreal', code: 'VIL', primaryColor: '#F5E216', secondaryColor: '#005187' },
];

export const TEAMS = [...WORLD_CUP_TEAMS, ...LEAGUE_TEAMS];
