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

// Base de datos de palabras
const WORD_DB: Category[] = [
  {
    name: 'Comida',
    words: [
      // Clásicos Arg
      'Asado', 'Milanesa', 'Choripán', 'Empanadas', 'Mate dulce', 'Dulce de Leche',
      'Fernet con Coca', 'Polenta', 'Locro', 'Alfajor de Maicena', 'Pastel de Papa',
      'Torta Frita', 'Chipá', 'Mantecol', 'Vitel Toné', 'Flan', 'Arroz con leche',
      // Toque Cordobés
      'Lomito', 'Vino con pritty', 'Criollitos', 'Salame',
      // General
      'Pizza', 'Hamburguesa', 'Sushi', 'Pochoclos', 'Helado', 'Tacos', 'Ensalada de frutas', 'Picada',
      'Pizza fría del día anterior', 'Tostado de jamón y queso', 'Pasta Frola'
    ]
  },
  {
    name: 'Lugares',
    words: [
      // Buenos Aires / Nacional
      'El Obelisco', 'La Bombonera', 'Mar del Plata', 'Bariloche', 'La Costanera',
      'Cataratas del Iguazú', 'La Patagonia', 'Ushuaia',
      // Córdoba
      'El Kempes', 'Villa Carlos Paz', 'Las Sierras', 'El Buen Pastor', 'Patio Olmos', 'La Cañada',
      'Cerro Uritorco', 'Cosquín', 'Festival de Jesús María', 'Nueva Córdoba',
      // General / Abstracto
      'Kiosco', 'Supermercado chino', 'Comisaría', 'Hospital', 'Cementerio',
      'Gimnasio', 'Desierto', 'Luna', 'Escuela', 'Cárcel', 'Terminal de Ómnibus', 'Paseo de Artesanos', 'Quincho'
    ]
  },
  {
    name: 'Objetos',
    words: [
      // Cotidiano Arg
      'Tarjeta Sube', 'Termo Stanley', 'Parrilla', 'Bidet', 'Ojotas', 'Repasador', 'Cacerola',
      'Control Remoto', 'Celular', 'DNI', 'Carnet de conducir',
      // Joda / Varios
      'Vaso viajero (botella cortada)', 'Conservadora', 'Reposera', 'Guitarra criolla', 'Pelota de fútbol',
      // General
      'Microondas', 'Ventilador de pie', 'Aire Acondicionado',
      'Papel Higiénico', 'Espejo', 'Sartén', 'Inodoro'
    ]
  },
  {
    name: 'Personajes',
    words: [
      // Ídolos
      'Messi', 'Maradona', 'El Papa Francisco', 'El Dibu Martínez', 'Julián Álvarez', 'Manu Ginóbili',
      'Susana Giménez', 'Ricardo Darín', 'Mirtha Legrand', 'Moria Casán', 'Guillermo Francella',
      'Bizarrap', 'Lali Espósito', 'Wanda Nara', 'Marcelo Tinelli', 'Milei', 'Taylor Swift', 'Bad Bunny',
      'Cristina Fernández de Kirchner', 'Alberto Fernández', 'Lionel Scaloni', 'Justin Bieber',
      'Liam Payne',
      // Córdoba
      'La Mona Jiménez', 'El Potro Rodrigo', 'Piñón Fijo', 'Paulo Londra',
      // Ficción / Mundial
      'El Chavo del 8', 'Batman', 'Spiderman', 'Papa Noel', 'Mickey Mouse', 'Shrek'
    ]
  },
  {
    name: 'Animales',
    words: [
      // Autóctonos / Comunes
      'Hornero', 'Carpincho', 'Mosquito', 'Vaca', 'Gato', 'Paloma',
      'Cucaracha', 'Puma', 'Yaguareté', 'Cóndor', 'Llama', 'Alacrán',
      // General
      'León', 'Elefante', 'Tiburón', 'Pingüino', 'Dinosaurio', 'Unicornio', 'Mono', 'Rata'
    ]
  },
  {
    name: 'Situaciones',
    words: [
      'Joda Clandestina', 'Cacerolazo', 'Hacer fila',
      'Bondi lleno', 'Día de lluvia y tortas fritas', 'Domingo de asado', 'La Previa', 'Boliche',
      'Final del Mundial 2022', 'Estar sin luz', 'Quedarse sin internet',
      'Baile de la Mona',
      // Eventos / General
      'Fiestas de fin de año', 'Casamiento', 'Velorio', 'Egresados en Bariloche',
      'Examen final', 'Primera cita', 'Entrevista de trabajo', 'Película de terror'
    ]
  },
  {
    name: 'Películas',
    words: [
      'Titanic', 'Harry Potter', 'Up', 'Toy Story', 'Buscando a Nemo',
      'El Padrino', 'Star Wars', 'Avatar', 'El Rey León',
      'Peter Pan', 'Jurassic Park', 'Matrix', 'Una noche en el museo', 'Rápido y Furioso'
    ]
  },
];

// Mapa de pistas semánticas para palabras
const HINTS_MAP: Record<string, string[]> = {

  // --- COMIDA ---
  'Asado': ['Domingo', 'Reunión', 'Humo', 'Juntada'],
  'Milanesa': ['Rallado', 'Huevo', 'Clásico'],
  'Choripán': ['Puesto', 'Mariposa', 'Paso'],
  'Empanadas': ['Carne', 'Tradición', 'Entrada'],
  'Mate dulce': ['Ronda', 'Desayuno', 'Controversial'],
  'Dulce de Leche': ['Cuchara', 'Untable', 'Postre', 'Clásico', 'Tostada'],
  'Fernet con Coca': ['Baile', 'Noche', 'Medida', 'Hielo'],
  'Polenta': ['Invierno', 'Queso', 'Textura', 'Olla', 'Salsa'],
  'Locro': ['Patrio', 'Espeso', 'Pesado', 'Olla'],
  'Alfajor de Maicena': ['Coco', 'Tarde', 'Sequedad', 'Dulce'],
  'Pastel de Papa': ['Capas', 'Carne', 'Invierno', 'Horno'],
  'Torta Frita': ['Lluvia', 'Mate', 'Tarde', 'Tradición'],
  'Chipá': ['Queso', 'Caliente', 'Bolita', 'Desayuno'],
  'Mantecol': ['Maní', 'Mesa', 'Brindis', 'Postre'],
  'Vitel Toné': ['Atún', 'Frío', 'Sobras', 'Fin de Año'],
  'Flan': ['Huevos', 'Caramelo', 'Mixto', 'Molde', 'Casero'],
  'Arroz con leche': ['Canela', 'Postre', 'Infancia', 'Cremoso'],
  'Lomito': ['Completo', 'Pan', 'Gigante', 'Córdoba', 'Papas'],
  'Vino con pritty': ['Mezcla', 'Gaseosa', 'Hielo', 'Barato', 'Verano'],
  'Criollitos': ['Cuadrado', 'Mate', 'Merienda'],
  'Salame': ['Picada', 'Tabla', 'Pan'],
  'Pizza': ['Delivery', 'Caja', 'Reunión'],
  'Hamburguesa': ['Pan', 'Rápido', 'Completa'],
  'Sushi': ['Arroz', 'Bocados', 'Frío'],
  'Pochoclos': ['Sonido', 'Bolsa', 'Gaseosa'],
  'Helado': ['Verano', 'Frío', 'Sabores', 'Postre'],
  'Tacos': ['Manos', 'Relleno', 'Carne', 'Condimentos'],
  'Ensalada de frutas': ['Jugo', 'Mezcla', 'Postre', 'Colores'],
  'Picada': ['Tabla', 'Queso', 'Compartir', 'Previa', 'Cerveza'],
  'Pizza fría del día anterior': ['Desayuno', 'Bajón', 'Sobras', 'Heladera', 'Ayer'],
  'Tostado de jamón y queso': ['Triángulo', 'Bar', 'Caliente', 'Plancha'],
  'Pasta Frola': ['Rejilla', 'Tarde', 'Casero'],

  // --- LUGARES ---
  'El Obelisco': ['Corrientes', 'Punta', 'Festejo', 'Tránsito', 'Fotos'],
  'La Bombonera': ['Oro', 'Barrio', 'Pasión', 'Late'],
  'Mar del Plata': ['Lobos', 'Casino', 'Alfajor', 'Verano'],
  'Bariloche': ['Nieve', 'Chocolate', 'Frío'],
  'La Costanera': ['Río', 'Carrito', 'Caminata', 'Pesca', 'Noche'],
  'Cataratas del Iguazú': ['Agua', 'Garganta', 'Caída', 'Mojado'],
  'La Patagonia': ['Sur', 'Viento', 'Frío', 'Inmensidad'],
  'Ushuaia': ['Extremo', 'Nieve', 'Frío', 'Canal'],
  'El Kempes': ['Recitales', 'Multitud', 'Festejos'],
  'Villa Carlos Paz': ['Reloj', 'Actores'],
  'Las Sierras': ['Montaña', 'Río', 'Aire', 'Córdoba', 'Caminata'],
  'El Buen Pastor': ['Aguas', 'Fuente', 'Capuchinos', 'Nueva Córdoba', 'Paseo'],
  'Patio Olmos': ['Shopping', 'Fuente', 'Centro', 'Encuentro', 'Cine'],
  'La Cañada': ['Piedra', 'Arroyo', 'Tipas', 'Centro'],
  'Cerro Uritorco': ['Subida', 'Capilla', 'Energía', 'Caminata', 'Alto'],
  'Cosquín': ['Música', 'Enero', 'Evento'],
  'Festival de Jesús María': ['Tradición', 'Enero', 'Música'],
  'Nueva Córdoba': ['Jóvenes', 'Bares', 'Edificios', 'Universidad', 'Joda'],
  'Kiosco': ['Esquina', 'Ventanita', 'Paso', 'Compras'],
  'Supermercado chino': ['Góndola', 'Caja', 'Barrio', 'Compras', 'Efectivo'],
  'Comisaría': ['Autoridad', 'Azul', 'Uniforme', 'Seguridad'],
  'Hospital': ['Pasillos', 'Guardia', 'Espera'],
  'Cementerio': ['Visita', 'Silencio', 'Historia'],
  'Gimnasio': ['Horario', 'Espejo', 'Rutina'],
  'Desierto': ['Sol', 'Nada', 'Calor'],
  'Luna': ['Noche', 'Blanco', 'Espacio', 'Fases'],
  'Escuela': ['Rutina', 'Horario'],
  'Cárcel': ['Control', 'Encierro', 'Tiempo', 'Muro', 'Seguridad'],
  'Terminal de Ómnibus': ['Salida', 'Espera', 'Horarios'],
  'Paseo de Artesanos': ['Feria', 'Manual', 'Regalos', 'Puestos', 'Caminata'],
  'Quincho': ['Asador', 'Fondo', 'Juntada', 'Techo', 'Grupo'],

  // --- OBJETOS ---
  'Tarjeta Sube': ['Plástico', 'Carga', 'Viaje', 'Apoyar'],
  'Termo Stanley': ['Verde', 'Mantener', 'Caro', 'Acero'],
  'Parrilla': ['Hierro', 'Fuego', 'Humo'],
  'Bidet': ['Baño', 'Agua', 'Argentino'],
  'Ojotas': ['Verano', 'Goma', 'Playa', 'Comodidad'],
  'Repasador': ['Cocina', 'Tela', 'Colgado', 'Mancha'],
  'Cacerola': ['Manija', 'Cocina', 'Ruido', 'Comida'],
  /* 'Bombilla tapada' removed */
  'Control Remoto': ['Canal', 'Distancia'],
  'Celular': ['Mano', 'Conexión'],
  'DNI': ['Plástico', 'Foto', 'Número'],
  'Carnet de conducir': ['Plástico', 'Control', 'Regla', 'Permiso'],
  'Vaso viajero (botella cortada)': ['Plástico', 'Botella', 'Borde'],
  'Conservadora': ['Hielo', 'Playa', 'Bebida', 'Frío', 'Caja'],
  'Reposera': ['Playa', 'Exterior', 'Tela', 'Descanso'],
  'Guitarra criolla': ['Madera', 'Fogón', 'Reunión', 'Manos'],
  'Pelota de fútbol': ['Cuero', 'Equipo'],
  'Microondas': ['Rápido', 'Cocina', 'Botones', 'Girar'],
  'Ventilador de pie': ['Aire', 'Girar', 'Verano', 'Ruido'],
  'Aire Acondicionado': ['Frío', 'Pared', 'Control', 'Verano', 'Ambiente'],
  /* 'Billetera vacía' removed */
  'Papel Higiénico': ['Diario', 'Suave'],
  'Espejo': ['Vidrio', 'Imagen', 'Baño'],
  'Sartén': ['Superficie', 'Cocina'],
  'Inodoro': ['Diario', 'Sentarse', 'Botón'],

  // --- PERSONAJES ---
  'Messi': ['Cabra', 'Ídolo'],
  'Maradona': ['Mano', 'Eterno', 'Historia'],
  'El Papa Francisco': ['Blanco', 'Historia', 'Argentino'],
  'El Dibu Martínez': ['Confianza', 'Baile', 'Loco'],
  'Julián Álvarez': ['Pueblo'],
  'Manu Ginóbili': ['Bahía'],
  'Susana Giménez': ['Teléfono', 'Diva', 'Dinosaurio'],
  'Ricardo Darín': ['Cine', 'Secreto', 'Premios'],
  'Mirtha Legrand': ['Mesa', 'Joyas', 'Eterna'],
  'Moria Casán': ['Frases', 'Teatro', 'One', 'Jurado'],
  'Guillermo Francella': ['Bigote', 'Comedia', 'Racing', 'Humor'],
  'Bizarrap': ['Actualidad', 'Estudio', 'Sesión'],
  'Lali Espósito': ['Pop', 'Esperanza', 'Casting'],
  'Wanda Nara': ['Representante', 'Actualidad', 'Medios', 'Empresaria'],
  'Marcelo Tinelli': ['Micrófono', 'Baile', 'Noche', 'América'],
  'Milei': ['Peluca', 'Grito', 'Actualidad'],
  'Taylor Swift': ['Eras', 'Éxito', 'Parejas', 'Pop'],
  'Bad Bunny': ['Silla Plástica', 'Urbano', 'Actualidad'],
  'Cristina Fernández de Kirchner': ['Debate', 'Discurso', 'Domicilio'],
  'Alberto Fernández': ['Bigote', 'Polémica'],
  'Lionel Scaloni': ['Equipo', 'Estrategia'],
  'Justin Bieber': ['Hijo', 'Fama', 'Bebé'],
  'Liam Payne': ['Banda', 'Palermo', 'Hotel', 'Dirección'],
  'La Mona Jiménez': ['Rulos', 'Señas', 'Barrios'],
  'El Potro Rodrigo': ['Azul', 'Cielo', 'Historia'],
  'Piñón Fijo': ['Maquillaje', 'Bici', 'Chicos'],
  'Paulo Londra': ['Trap', 'Olvidado', 'Basquet'],
  'El Chavo del 8': ['Gorra', 'Pecas', 'Torta', 'Clásico'],
  'Batman': ['Noche', 'Capa', 'Auto', 'Justicia'],
  'Spiderman': ['Red', 'Edificio', 'Responsabilidad'],
  'Papa Noel': ['Diciembre', 'Mentira', 'Niños'],
  'Mickey Mouse': ['Orejas', 'Guantes', 'Herramienta'],
  'Shrek': ['Animación', 'Verde', 'Pantano'],

  // --- ANIMALES ---
  'Hornero': ['Barro'],
  'Carpincho': ['Roedor', 'Viral'],
  /* 'Perro Callejero' removed */
  'Mosquito': ['Verano', 'Noche', 'Pequeño'],
  'Vaca': ['Blanco', 'Manchas', 'Cuero', 'Pasto'],
  'Gato': ['Caja', 'Casa'],
  'Paloma': ['Plaza', 'Sucio', 'Gris', 'Ciudad', 'Cuello'],
  'Cucaracha': ['Miedo', 'Oscuridad'],
  'Puma': ['Salvaje', 'Garra'],
  'Yaguareté': ['Billete', 'Selva', 'Manchas'],
  'Cóndor': ['Andes', 'Grande', 'Altura'],
  'Llama': ['Norte', 'Lana', 'Montaña', 'Cuello'],
  'Alacrán': ['Veneno', 'Cola', 'Miedo', 'Oscuro', 'Verano'],
  'León': ['Manada', 'Sabana'],
  'Elefante': ['Peso', 'Grande', 'Gris', 'Memoria'],
  'Tiburón': ['Agua', 'Película', 'Miedo'],
  'Pingüino': ['Frío', 'Negro', 'Blanco', 'Ave'],
  'Dinosaurio': ['Huesos', 'Película'],
  'Unicornio': ['Cuerno', 'Colores'],
  'Mono': ['Selva', 'Agilidad'],
  'Rata': ['Escondite', 'Peste', 'Ciudad'],

  // --- SITUACIONES ---
  'Joda Clandestina': ['Escondido', 'Noche', 'Prohibido'],
  'Cacerolazo': ['Ruido', 'Queja'],
  'Hacer fila': ['Parado', 'Tiempo', 'Turno'],
  'Bondi lleno': ['Apretado', 'Boleto', 'Parado'],
  'Día de lluvia y tortas fritas': ['Gris', 'Tradición', 'Casa'],
  'Domingo de asado': ['Familia', 'Humo', 'Mediodía', 'Mesa', 'Carne'],
  'La Previa': ['Alcohol', 'Música', 'Amigos', 'Casa'],
  'Boliche': ['Noche', 'Gente', 'Entrada'],
  'Final del Mundial 2022': ['Nervios', 'Diciembre', 'Historia'],
  'Estar sin luz': ['Molestia', 'Oscuridad', 'Calor', 'Espera'],
  'Quedarse sin internet': ['Desconexión', 'Frustración'],
  'Baile de la Mona': ['Señas', 'Multitud', 'Vino'],
  'Fiestas de fin de año': ['Comida', 'Ilusión', 'Familia', 'Cierre'],
  'Casamiento': ['Arroz', 'Invitados'],
  'Velorio': ['Silencio', 'Reunión'],
  'Egresados en Bariloche': ['Hotel', 'Boliche', 'Nieve', 'Campera'],
  'Examen final': ['Nervios', 'Mesa', 'Alivio'],
  'Primera cita': ['Nervios', 'Conocer', 'Charla', 'Impresión'],
  'Entrevista de trabajo': ['Preguntas', 'Nervios', 'Formal'],
  'Película de terror': ['Miedo', 'Grito', 'Susto', 'Oscuro', 'Sangre'],

  // --- PELÍCULAS ---
  'Titanic': ['Hielo', 'Tabla'],
  'Harry Potter': ['Aventura', 'Saga', 'Lentes'],
  'Up': ['Recuerdos', 'Animación'],
  'Toy Story': ['Amigo', 'Olvidados'],
  'Buscando a Nemo': ['Hijo', 'Memoria'],
  'El Padrino': ['Mafia', 'Familia', 'Traje'],
  'Star Wars': ['Padre', 'Guerra'],
  'Avatar': ['Azul', 'Planeta', 'Cultura'],
  'El Rey León': ['Destino', 'Familia', ' Crecimiento'],
  'Peter Pan': ['Volar', 'Sombra', 'Infancia'],
  'Jurassic Park': ['Isla', 'Criaturas', 'Aventura'],
  'Matrix': ['Despertar', 'Elección', 'Lentes', 'Realidad'],
  'Una noche en el museo': ['Noche', 'Vida', 'Esqueleto', 'Guardia'],
  'Rápido y Furioso': ['Saga', 'Familia', 'Acción']
};

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
  showMultipleImpostors = signal<boolean>(false);
  showImpostorHint = signal<boolean>(false);

  // Game Logic State
  currentSecretWord = signal<string>('');
  currentCategory = signal<string>('');
  currentImpostorHint = signal<string>('');
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
  // Reveal countdown (seconds)
  revealCountdown = signal<number>(0);
  // Rules modal
  rulesModalOpen = signal<boolean>(false);

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
    const raw = this.newPlayerName.trim();
    if (!raw) return;

    const name = raw.toUpperCase();

    // Check duplicates (stored names are uppercase)
    if (this.players().some(p => p.name.toUpperCase() === name)) {
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

  toggleMultipleImpostors() {
    this.showMultipleImpostors.update(v => !v);
  }

  toggleImpostorHint() {
    this.showImpostorHint.update(v => !v);
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

    // Generar pista si está habilitada
    if (this.showImpostorHint()) {
      this.generateImpostorHint(category.words[randomWordIndex]);
    } else {
      this.currentImpostorHint.set('');
    }

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

  openRules() {
    this.rulesModalOpen.set(true);
  }

  closeRules() {
    this.rulesModalOpen.set(false);
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

  startRevealCountdown() {
    if (this.revealCountdown() > 0) return; // already counting
    let n = 3;
    this.revealCountdown.set(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id as any);
        this.revealCountdown.set(0);
        this.revealResults();
      } else {
        this.revealCountdown.set(n);
      }
    }, 1000);
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

  // --- Hint Generation ---
  private generateImpostorHint(secretWord: string): void {
    const hints = this.getHintsForWord(secretWord);
    if (hints.length > 0) {
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      this.currentImpostorHint.set(randomHint);
    } else {
      this.currentImpostorHint.set('');
    }
  }

  private getHintsForWord(word: string): string[] {
    // Buscar pista exacta en el mapa
    if (HINTS_MAP[word]) {
      return HINTS_MAP[word];
    }

    // Si no hay pista exacta, intentar buscar por palabras clave
    const lowerWord = word.toLowerCase();
    for (const [key, hints] of Object.entries(HINTS_MAP)) {
      if (key.toLowerCase() === lowerWord) {
        return hints;
      }
    }

    // Si no hay pista, retornar array vacío
    return [];
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