import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// --- DATA & TYPES ---

type Player = {
  id: string;
  name: string;
  isImpostor: boolean;
  hasSeenRole: boolean;
};

type GameState = 'SETUP' | 'REVEAL_PHASE' | 'PLAYING' | 'RESULTS';

type Category = {
  name: string;
  words: string[];
};

// Base de datos de palabras bien argentas y variadas
const WORD_DB: Category[] = [
  { name: 'Comida', words: ['Asado', 'Milanesa', 'Choripán', 'Empanadas', 'Mate', 'Dulce de Leche', 'Fernet', 'Polenta', 'Locro', 'Alfajor'] },
  { name: 'Lugares', words: ['El Obelisco', 'La Bombonera', 'Mar del Plata', 'Bariloche', 'El Conurbano', 'Caminito', 'Aeroparque', 'Un Kiosco', 'La Costanera', 'El Subte'] },
  { name: 'Objetos', words: ['La Sube', 'Termo Stanley', 'Parrilla', 'Bidet', 'Ojotas', 'Repasador', 'Cacerola', 'Bombilla', 'Control Remoto', 'Celular'] },
  { name: 'Personajes', words: ['Messi', 'Maradona', 'El Papa Francisco', 'Susana Giménez', 'Ricardo Darín', 'Mirtha Legrand', 'El Dibu', 'Fito Páez', 'Charly García', 'Milei'] },
  { name: 'Animales', words: ['Hornero', 'Carpincho', 'Perro Callejero', 'Mosquito', 'Vaca', 'Gato', 'Paloma', 'Cucaracha', 'Puma', 'Yaguareté'] },
  { name: 'Situaciones', words: ['Fiesta Clandestina', 'Piketera', 'Cacerolazo', 'Hacer la fila', 'Bondi lleno', 'Día de lluvia', 'Domingo de asado', 'Previa', 'Boliche', 'Final del Mundial', 'Trámite en ANSES'] },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // --- SIGNALS STATE ---
  gameState = signal<GameState>('SETUP');
  players = signal<Player[]>([]);
  impostorCount = signal<number>(1);
  showCategory = signal<boolean>(true);
  
  // Game Logic State
  currentSecretWord = signal<string>('');
  currentCategory = signal<string>('');
  startingPlayerName = signal<string>('');
  roundDirection = signal<'Horario' | 'Antihorario'>('Horario');
  
  // UI State
  newPlayerName = '';
  errorMessage = signal<string>('');
  
  // Modal State
  isModalOpen = false;
  currentPlayerReviewing: Player | null = null;
  isRevealingSecret = false;
  hasRevealedSecretOnce = false;

  // --- COMPUTED ---
  maxImpostors = computed(() => {
    // Siempre tiene que haber más inocentes que impostores (o al menos margen)
    // Regla simple: Max impostores = (Total Jugadores - 1) / 2
    const total = this.players().length;
    return total < 3 ? 1 : Math.floor((total - 1) / 2) || 1;
  });

  canStart = computed(() => {
    const pCount = this.players().length;
    const iCount = this.impostorCount();
    return pCount >= 3 && iCount >= 1 && iCount < pCount;
  });

  impostorsList = computed(() => this.players().filter(p => p.isImpostor));
  directionIcon = computed(() => this.roundDirection() === 'Horario' ? '↻' : '↺');

  // --- METHODS ---

  constructor() {
    // Fix logic if impostor count exceeds players due to removal
    effect(() => {
      if (this.impostorCount() > this.maxImpostors()) {
        this.impostorCount.set(this.maxImpostors());
      }
    });
  }

  addPlayer() {
    const name = this.newPlayerName.trim();
    if (!name) return;
    
    // Check duplicates
    if (this.players().some(p => p.name.toLowerCase() === name.toLowerCase())) {
      this.errorMessage.set('¡Ya existe ese jugador!');
      setTimeout(() => this.errorMessage.set(''), 2000);
      return;
    }

    this.players.update(prev => [...prev, {
      id: crypto.randomUUID(),
      name: name,
      isImpostor: false,
      hasSeenRole: false
    }]);
    
    this.newPlayerName = '';
    this.errorMessage.set('');
  }

  removePlayer(id: string) {
    this.players.update(prev => prev.filter(p => p.id !== id));
  }

  toggleCategory() {
    this.showCategory.update(v => !v);
  }

  increaseImpostors() {
    if (this.impostorCount() < this.maxImpostors()) {
      this.impostorCount.update(v => v + 1);
    }
  }

  decreaseImpostors() {
    if (this.impostorCount() > 1) {
      this.impostorCount.update(v => v - 1);
    }
  }

  startGame() {
    if (!this.canStart()) {
      this.errorMessage.set('Necesitás mínimo 3 jugadores.');
      return;
    }

    // 1. Elegir Palabra
    const randomCatIndex = Math.floor(Math.random() * WORD_DB.length);
    const category = WORD_DB[randomCatIndex];
    const randomWordIndex = Math.floor(Math.random() * category.words.length);
    
    this.currentCategory.set(category.name);
    this.currentSecretWord.set(category.words[randomWordIndex]);

    // 2. Asignar Roles
    const currentPlayers = [...this.players()];
    // Resetear estados previos
    currentPlayers.forEach(p => {
      p.isImpostor = false;
      p.hasSeenRole = false;
    });

    // Shuffle simple
    const shuffled = currentPlayers.sort(() => 0.5 - Math.random());
    
    // Marcar impostores
    for (let i = 0; i < this.impostorCount(); i++) {
      shuffled[i].isImpostor = true;
    }

    // Devolver ordenados por nombre para que sea más fácil encontrarse
    this.players.set(currentPlayers.sort((a, b) => a.name.localeCompare(b.name)));
    
    // Track start of game (no secret word sent)
    this.trackEvent('start_game', {
      playerCount: this.players().length,
      impostorCount: this.impostorCount(),
      category: this.currentCategory(),
    });

    this.gameState.set('REVEAL_PHASE');
  }

  // --- MODAL LOGIC ---

  openRevealModal(player: Player) {
    this.currentPlayerReviewing = player;
    this.isRevealingSecret = false; // Reset state
    this.hasRevealedSecretOnce = false; // Reset lock
    this.isModalOpen = true;
  }

  revealSecret() {
    this.isRevealingSecret = true;
    this.hasRevealedSecretOnce = true;
  }

  hideSecret() {
    this.isRevealingSecret = false;
  }

  closeModal() {
    if (this.currentPlayerReviewing) {
      // Marcar como visto
      this.players.update(list => list.map(p => 
        p.id === this.currentPlayerReviewing!.id ? { ...p, hasSeenRole: true } : p
      ));
    }
    this.isModalOpen = false;
    this.currentPlayerReviewing = null;

    // Chequear si todos vieron
    if (this.players().every(p => p.hasSeenRole)) {
      this.startRoundLogic();
    }
  }

  // --- ROUND LOGIC ---

  startRoundLogic() {
    // Elegir quién empieza
    const allPlayers = this.players();
    const randomIndex = Math.floor(Math.random() * allPlayers.length);
    this.startingPlayerName.set(allPlayers[randomIndex].name);
    
    // Elegir sentido
    this.roundDirection.set(Math.random() > 0.5 ? 'Horario' : 'Antihorario');
    
    this.gameState.set('PLAYING');
  }

  revealResults() {
    // Track when results are revealed
    this.trackEvent('view_results', {
      playerCount: this.players().length,
      impostors: this.impostorsList().map(p => p.name),
      category: this.currentCategory(),
    });

    this.gameState.set('RESULTS');
  }

  resetGame() {
    // Track reset action
    this.trackEvent('reset_game', { playerCount: this.players().length });

    // Volver al setup pero manteniendo jugadores
    const resetPlayers = this.players().map(p => ({
      ...p,
      isImpostor: false,
      hasSeenRole: false
    }));
    this.players.set(resetPlayers);
    this.gameState.set('SETUP');
  }

  // --- Analytics helper ---
  trackEvent(name: string, details: Record<string, any> = {}) {
    try {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: name, ...details });
    } catch (e) {
      // ignore in non-browser environments
    }
  }
}