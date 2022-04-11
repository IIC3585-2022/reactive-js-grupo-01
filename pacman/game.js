/**
 * CONSTANTES
 */

// Representacion string del mapa. cada X es un obstáculo, . es un espacio vacio
MAP =
`
XXXXXXXXXXXXX
X...........X
X.X.X.X.X.X.X
X...........X
X.X.X.X.X.X.X
X...........X
X.X.X.X.X.X.X
X...........X
XXXXXXXXXXXXX
`

MAP_ROWS = 9;
MAP_COLS = 13;
/*
MAP = ""

for(let i=0; i<MAP_ROWS; i++) {
    for(let j=0; j<MAP_COLS; j++) {
        if(Math.random() < 0.5) {
            MAP += "X";
            
        } else {
            MAP += "."
        }
    }
    MAP += "\n";
}
*/
// Inicio del jugador

CANVAS_WIDTH = 600;
CANVAS_HEIGHT = 600;

OBSTACLE_CHAR = "X";
OBSTACLE_COLOR = "#000000";

SMALL_DOT_CHAR = "*";
//SMALL_DOT_COLOR = "#ffff00";
SMALL_DOT_COLOR = "#ff0000";

NOTHING_CHAR = ".";
NOTHING_COLOR = "#ffffff";

READY_COLOR = "#ff0000";

// 2 jugadores
PLAYERS = [
  {
    UP: 87,    // W
    DOWN: 83,  // S
    LEFT: 65,  // A
    RIGHT: 68, // D
    COLOR: "#00ff00",
    START_X: 1,
    START_Y: 1,
  },
  {
    UP: 38,    // arrow up
    DOWN: 40,  // arrow down
    LEFT: 37,  // arrow left
    RIGHT: 39, // arrow right
    COLOR: "#ffff00",
    START_X: 7,
    START_Y: 1,
  },
/*  {
    UP: 73,    // I
    DOWN: 75,  // K
    LEFT: 74,  // J
    RIGHT: 76, // L
    COLOR: "#0000ff",
    START_X: 5,
    START_Y: 1,
  },
  */
]

DIRECTIONS = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
}

R = 82;

X_PLAYER_DELTA = 0.1;
Y_PLAYER_DELTA = 0.1;

GAME_UPDATE_TIME = 50;
ANIMATION_TIME = 50;
ANIMATION_DELTA = 1;

SMALL_DOT_SCORE = 10;

PACMAN_SOUND_DURATION = 475;
PACMAN_INTRO_TIME = 5000;

/**
 * CODIGO
 */

/********** setup ********/

const c=document.getElementById("myCanvas");
c.width = CANVAS_WIDTH;
c.height = CANVAS_HEIGHT;
const ctx=c.getContext("2d");

const map = createMap(MAP);


/*********** Parseo de inputs **********/

const smallDots = new rxjs.BehaviorSubject(createSmallDots(map));

function createMap(mapstring) {
  let rows = mapstring.trim().split("\n");
  return rows.map(row => row.split(""));
}

function createSmallDots(map) {
  return map.map((row, i) =>
    row.map((c, j) => {
      if(c === NOTHING_CHAR) {
        if(PLAYERS.some((PLAYER) => PLAYER.START_X === i && PLAYER.START_Y === j)){
          return NOTHING_CHAR;
        }
        return SMALL_DOT_CHAR;
      }
      return NOTHING_CHAR;
    })
  )
}

/********** entidades **********/

const players = PLAYERS.map(PLAYER => 
  new rxjs.BehaviorSubject({
    X: PLAYER.START_X,
    Y: PLAYER.START_Y,
    DIR: DIRECTIONS.UP,
  }));

const scores = PLAYERS.map((PLAYER) => 
    new rxjs.BehaviorSubject(0)
  );

scores.forEach((score, i) => score.subscribe((s) => console.log(`score player ${i+1}: ${s}`)));

const gameReady = new rxjs.BehaviorSubject(true);
const gameStarted = new rxjs.BehaviorSubject(false);

function prepareGame(s) {
  if(s == true) {
    setTimeout(() => gameStarted.next(true), PACMAN_INTRO_TIME);
    const startSound = document.getElementById("introSound");
    startSound.play();
  }
}
gameReady.subscribe(prepareGame)

const keyPress = new rxjs.fromEvent(document, "keydown")
  .pipe(
    rxjs.operators.distinctUntilKeyChanged("keyCode"),
    rxjs.operators.pluck("keyCode")
  );


const gameEnded = new rxjs.BehaviorSubject(false);

function movementController(keyCode) {
  PLAYERS.forEach((PLAYER, i) => {
    switch(keyCode) {
      case PLAYER.UP:
        players[i].next({...players[i].getValue(), DIR: DIRECTIONS.UP})
        break;
      case PLAYER.DOWN:
        players[i].next({...players[i].getValue(), DIR: DIRECTIONS.DOWN})
        break;
      case PLAYER.LEFT:
        players[i].next({...players[i].getValue(), DIR: DIRECTIONS.LEFT})
        break;
      case PLAYER.RIGHT:
        players[i].next({...players[i].getValue(), DIR: DIRECTIONS.RIGHT})
        break;
    }
  });
}

function restartController(keyCode) {
  switch(keyCode) {
    case R:
      restartGame();
      break;
  }
}

keyPress.subscribe(movementController);
keyPress.subscribe(restartController);

const updateTimer = new rxjs.timer(0, GAME_UPDATE_TIME);

function updateController() {
  // actualizamos los jugadores
  if(!gameStarted.getValue()) {
    // Si aun no empieza no hacer nada
    return;
  }
  players.forEach((player, i) => {
    const { X, Y, DIR } = player.getValue();
    let newX = X, newY = Y;
    switch(DIR) {
      case DIRECTIONS.UP:
        newY -= Y_PLAYER_DELTA;
        if(map[Math.round(X)][Math.ceil(newY - 1)] === OBSTACLE_CHAR) {
          newY = Y;
        }
        break;
      case DIRECTIONS.DOWN:
        newY += X_PLAYER_DELTA;
        if(map[Math.round(X)][Math.floor(newY + 1)] === OBSTACLE_CHAR) {
          newY = Y;
        }
        break;
      case DIRECTIONS.LEFT:
        newX -= X_PLAYER_DELTA;
        if(map[Math.ceil(newX - 1)][Math.round(Y)] === OBSTACLE_CHAR) {
          newX = X;
        }
        break;
      case DIRECTIONS.RIGHT:
        newX += X_PLAYER_DELTA;
        if(map[Math.floor(newX + 1)][Math.round(Y)] === OBSTACLE_CHAR) {
          newX = X;
        }
        break;
    }
    player.next({
      X: newX,
      Y: newY,
      DIR,
    })
  })
}

/******** COLISIONES *******/

function collisionController() {
  for(let i=0; i<players.length; i++) {
    const { X, Y } = players[i].getValue();
    const positions = smallDots.getValue();
    if(positions[Math.round(X)][Math.round(Y)] === SMALL_DOT_CHAR) {
      positions[Math.round(X)][Math.round(Y)] = NOTHING_CHAR;
      smallDots.next(positions);
      scores[i].next(scores[i].getValue() + SMALL_DOT_SCORE);
      break;
    }

  }
  // AQUI SE PODRIAN PONER LOS ENEMIGOS
}

updateTimer.subscribe(updateController);

players.forEach((player) => player.subscribe(collisionController));

function restartGame() {
  console.log("restarting...");

  var sounds = document.getElementsByTagName('audio');
  for(i=0; i<sounds.length; i++) sounds[i].pause();

  gameStarted.next(false);
  gameReady.next(true);

  smallDots.next(createSmallDots(map));
  players.forEach((player, i) => {
    player.next({
      X: PLAYERS[i].START_X,
      Y: PLAYERS[i].START_Y,
      DIR: DIRECTIONS.UP,
    });
  });
  scores.forEach((score) => score.next(0));

}

/********* Puntos ************/

/*********** Actualizacion de dibujo *************/
const animationTime = new rxjs.BehaviorSubject(0);
const animationTimer = new rxjs.timer(0, ANIMATION_TIME).subscribe(() => {
  animationTime.next(animationTime.getValue() + ANIMATION_DELTA);
})

players.forEach(player => {
  player.subscribe(() => drawCanvas(ctx, map));
})

animationTime.subscribe(() => drawCanvas(ctx, map));

smallDots.subscribe(() => drawCanvas(ctx, map));

// fin del juego
function endGame() {
  
  if(smallDots.getValue().some((row) => 
    row.some((c) => c === SMALL_DOT_CHAR)))
  {
    gameEnded.next(false);
    return;
  }

  var sounds = document.getElementsByTagName('audio');
  for(i=0; i<sounds.length; i++) sounds[i].pause();

  const finalSound = document.getElementById("pacmanFinalSound");
  finalSound.play();
  gameEnded.next(true);
}

smallDots.subscribe(endGame);

gameEnded.subscribe(() => drawCanvas(ctx, map));

gameStarted.subscribe(() => drawCanvas(ctx, map));

scores.forEach((score) => score.subscribe(() => drawCanvas(ctx, map)));

/******** Funciones para dibujar *******/

function drawCanvas(ctx, map) {
  // CLEAR SCREEN
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if(!gameEnded.getValue()) {
    // MAP (background)
    drawMap(ctx, map);
  
    // SMALL DOTS
    smallDots.getValue().forEach((row, i) =>
      row.forEach((char, j) => {
        if(char === SMALL_DOT_CHAR) {
          drawSmallDot(ctx, i, j, MAP_ROWS, MAP_COLS, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }))

      // PLAYERS
      players.forEach((player, i) => {
        const { X, Y, DIR } = player.getValue()
        drawPlayer(ctx, X, Y, MAP_ROWS, MAP_COLS, CANVAS_WIDTH, CANVAS_HEIGHT, DIR, PLAYERS[i].COLOR, animationTime.getValue());// time);
      })
      // SCORE
      scores.forEach((score, i) => {
        drawScore(ctx, score.getValue(), i);
      })


    if(gameReady.getValue() && !gameStarted.getValue()) {
      drawReady(ctx);
    }
  } else {
    drawFinalScreen(ctx, scores.map((score) => score.getValue()));
  }
}

function drawMap(ctx, map) {
  map.forEach((row, i) => {
    row.forEach((char, j) => {
      switch(char) {
        case OBSTACLE_CHAR:
          drawObstacle(ctx, i, j, MAP_ROWS, MAP_COLS, CANVAS_WIDTH, CANVAS_HEIGHT);
          break;
        case NOTHING_CHAR:
          drawNothing(ctx, i, j, MAP_ROWS, MAP_COLS, CANVAS_WIDTH, CANVAS_HEIGHT);
          break;
      }
    });
  });
  //i+= 0.0001;
}

function drawObstacle(ctx, i, j, rows, cols, canvas_width, canvas_height) {
  const tile_width = Math.ceil(canvas_width / rows);
  const tile_height = Math.ceil(canvas_height / cols);

  const tile_x = Math.floor(i * tile_width);
  const tile_y = Math.floor(j * tile_height);

  ctx.fillStyle = OBSTACLE_COLOR;
  ctx.fillRect(tile_x, tile_y, tile_width, tile_height);
}

function drawSmallDot(ctx, i, j, rows, cols, canvas_width, canvas_height) {
  const tile_width = Math.ceil(canvas_width / rows);
  const tile_height = Math.ceil(canvas_height / cols);

  const tile_x = Math.floor(i * tile_width);
  const tile_y = Math.floor(j * tile_height);

  ctx.beginPath()
  ctx.fillStyle = SMALL_DOT_COLOR;
  ctx.ellipse(tile_x + tile_width / 2, tile_y + tile_height / 2, tile_width / 10, tile_height / 10, 0, 0, 2 * Math.PI);
  ctx.fill()
}

function drawBigDot(ctx, i, j, rows, cols, canvas_width, canvas_height) {
  const tile_width = Math.ceil(canvas_width / rows);
  const tile_height = Math.ceil(canvas_height / cols);

  const tile_x = Math.floor(i * tile_width);
  const tile_y = Math.floor(j * tile_height);

  ctx.fillStyle = BIG_DOT_COLOR;
  ctx.fillRect(tile_x, tile_y, tile_width, tile_height);
}

function drawNothing(ctx, i, j, rows, cols, canvas_width, canvas_height) {
  // Intencionalmente en blanco
}

function drawPlayer(ctx, i, j, rows, cols, canvas_width, canvas_height, direction, player_color, time) {
  const tile_width = Math.ceil(canvas_width / rows);
  const tile_height = Math.ceil(canvas_height / cols);

  const tile_x = Math.floor(i * tile_width);
  const tile_y = Math.floor(j * tile_height);

  let startAngle, endAngle;

  if(direction == DIRECTIONS.UP) {
    startAngle = (0.1 * Math.cos(time) - 0.2) * Math.PI;
    endAngle = (1 - 0.1 * Math.cos(time) + 0.2) * Math.PI;
  } else if(direction == DIRECTIONS.DOWN) {
    startAngle = (0.1 * Math.cos(time) - 0.2 + 1) * Math.PI;
    endAngle = (1 - 0.1 * Math.cos(time) + 0.2 + 1) * Math.PI;
  } else if(direction == DIRECTIONS.LEFT) {
    startAngle = (0.1 * Math.cos(time) - 0.2 + 3/2) * Math.PI;
    endAngle = (1 - 0.1 * Math.cos(time) + 0.2 + 3/2) * Math.PI;
  } else if(direction == DIRECTIONS.RIGHT) {
    startAngle = (0.1 * Math.cos(time) - 0.2 + 1/2) * Math.PI;
    endAngle = (1 - 0.1 * Math.cos(time) + 0.2 + 1/2) * Math.PI;
  }

  ctx.beginPath()
  ctx.fillStyle = player_color;
  ctx.arc(tile_x + tile_width / 2, tile_y + tile_height / 2, tile_height / 2, startAngle, endAngle);
  ctx.lineTo(tile_x + tile_width / 2, tile_y + tile_height / 2);
  ctx.fill()
}

function drawScore(ctx, score, index) {
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = PLAYERS[index].COLOR;
  console.log(ctx.fillColor);
  ctx.fillText(`player ${index+1} score: ${score}`, 0, (index+1) * 14)
}

function drawReady(ctx) {
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = READY_COLOR;
  ctx.fillText("READY", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function drawFinalScreen(ctx, scores) {
  const bestIndex = scores.indexOf(Math.max(...scores));
  ctx.fillStyle = PLAYERS[bestIndex].COLOR;
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Finished", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  scores.forEach((score, i) => {
    ctx.fillStyle = PLAYERS[i].COLOR;
    ctx.fillText(`Player ${i}' final score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30 * (i + 1));
  })
}

function playEatSound() {
  if(gameReady.getValue() && gameStarted.getValue()){
    const audio = document.getElementById('pacmanSound');
    const newAudio = audio.cloneNode(true);
    newAudio.play()
  }
}

smallDots.pipe(
   rxjs.operators.throttleTime(PACMAN_SOUND_DURATION)
).subscribe(playEatSound);
