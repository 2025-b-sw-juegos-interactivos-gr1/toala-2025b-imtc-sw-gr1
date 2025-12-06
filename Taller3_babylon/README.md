# Proyecto Babylon.js - Escena Espacial

Proyecto interactivo 3D con Babylon.js que incluye una escena espacial con una figura humana, meteoritos animados y cielo estrellado.

## Estructura del Proyecto

```
babylon-project/
├── index.html              # Página principal
├── package.json            # Dependencias del proyecto
├── js/
│   └── app.js             # Lógica de la escena Babylon.js
└── assets/
    └── textures/          # Carpeta para texturas (PNG, JPG, etc.)
```

## Requisitos

- Node.js (con npm)
- Navegador moderno con soporte WebGL

## Instalación

1. Navega a la carpeta del proyecto:
```bash
cd babylon-project
```

# Superman 3D - Evasión de Meteoritos

Juego interactivo 3D con Babylon.js donde controlas a un personaje volador tipo Superman que debe esquivar meteoritos mientras vuela a través del espacio.

## Características

✨ **Personaje Volador**
- Personaje humanoides tipo Superman con capa roja
- Controles WASD para movimiento en 3D
- Sistema de cámara en tercera persona
- Aceleración con ESPACIO

🌍 **Entorno Inmersivo**
- Skybox espacial procedural con estrellas animadas
- Iluminación realista con luces ambientales y puntuales
- Sensación de vuelo en espacio infinito

☄️ **Meteoritos Desafiantes**
- Modelos 3D realistas con material de roca
- Sistema de partículas de fuego y llamas
- Movimiento continuo hacia el jugador
- Colisiones detectadas automáticamente
- Regeneración infinita de meteoritos

📊 **Sistema de Puntuación**
- Contador de meteoritos esquivados
- Posición en tiempo real del jugador
- UI clara y accesible

## Estructura del Proyecto

```
Taller3_babylon/
├── index.html              # Página principal con UI
├── package.json            # Dependencias del proyecto
├── README.md              # Este archivo
├── js/
│   └── app.js             # Lógica del juego completa
└── assets/
    └── textures/          # Carpeta para texturas personalizadas
```

## Requisitos

- Node.js v14 o superior
- Navegador moderno con soporte WebGL
- npm (incluido con Node.js)

## Instalación y Ejecución

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar el servidor

```bash
npm start
```

El servidor se levantará en `http://localhost:8080`

### 3. Acceder al juego

Abre tu navegador en:
```
http://localhost:8080
```

## Controles

| Tecla | Acción |
|-------|--------|
| **W** | Volar hacia arriba |
| **S** | Volar hacia abajo |
| **A** | Volar hacia la izquierda |
| **D** | Volar hacia la derecha |
| **ESPACIO** | Acelerar (1.5x velocidad) |
| **RATÓN** | Girar la vista (solo observación, no afecta el movimiento) |

## Mecánicas del Juego

### Movimiento del Jugador
- El personaje se mueve libremente en 3D
- La velocidad se multiplica por 1.5 cuando aceleras con ESPACIO
- El movimiento está limitado en un área segura alrededor del eje Z

### Sistema de Meteoritos
- 8 meteoritos spawning continuamente desde el fondo
- Caen hacia la cámara con movimiento realista
- Rotación constante para efecto visual dinámico
- Partículas de fuego alrededor de cada meteorito
- Se regeneran cuando salen del rango visible
- Las colisiones se cuentan en la puntuación

### Cámara
- Sigue al personaje desde una distancia fija
- Suave interpolación para movimiento natural
- Posición relativa al personaje (tercera persona)

## Detalles Técnicos

### Tecnologías Utilizadas
- **Babylon.js 6.x** - Motor 3D WebGL
- **HTML5 Canvas** - Renderizado
- **JavaScript ES6+** - Lógica del juego
- **http-server** - Servidor web local

### Sistema de Partículas
- Textura procedural de fuego
- Emisión continua de partículas
- Gravedad y velocidad variables
- Colores degradados naranja-rojo

### Iluminación
- Luz hemisférica ambiental para iluminación global
- Luz puntual adicional para profundidad
- Materiales con especularidad realista

## Personalización

### Cambiar la velocidad del juego

En `js/app.js`, modifica la variable `playerData.speed`:
```javascript
playerData.speed = 0.5; // Aumenta para mayor velocidad
```

### Cambiar cantidad de meteoritos

Busca la línea:
```javascript
for (let i = 0; i < 8; i++) {
    createMeteor();
}
```

Cambia `8` por el número deseado.

### Modificar velocidad de meteoritos

En la función `createMeteor()`, busca:
```javascript
meteoritos.push({ mesh: meteor, particles: fireSystem, speed: 0.2 });
```

Aumenta `0.2` para meteoritos más rápidos.

### Cambiar colores del personaje

En `createScene()`, modifica:
```javascript
playerMat.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.8); // RGB (0-1)
```

## Solución de Problemas

### El juego no carga
- Verifica que http-server esté ejecutándose
- Abre la consola del navegador (F12) para ver errores
- Intenta refrescar la página (Ctrl+F5)

### Las partículas de fuego no se ven
- Verifica que Babylon.js esté cargado correctamente
- Comprueba los errores en la consola del navegador

### Movimiento lento o entrecortado
- Reduce la cantidad de meteoritos
- Cierra otras aplicaciones que usen GPU
- Actualiza los drivers de tu tarjeta gráfica

## Créditos

Proyecto desarrollado con Babylon.js - www.babylonjs.com

## Licencia

MIT License - Libre para uso educativo y comercial

## Próximas Mejoras Sugeridas

- 🎵 Agregar audio y música de fondo
- 📈 Sistema de dificultad progresiva
- 🏆 Tabla de puntuaciones
- ✨ Efectos visuales adicionales (rayos, explosiones)
- 🎮 Efectos de controlador (vibración, feedback)
- 🌐 Multijugador local o en línea
- 📱 Soporte para dispositivos móviles
