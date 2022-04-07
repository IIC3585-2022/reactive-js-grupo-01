const { Observable, fromEvent, timer, interval, of, combineLatest, BehaviorSubject} = rxjs;
const { finalize, map, tap, merge, sample, scan, pluck, throttleTime, filter, startWith, takeWhile, share} = rxjs.operators

const PLAYER_WIDTH = 80
const PLAYER_HEIGTH = 80
const CAR_WIDTH = 50
const MAP_WIDTH = 800
const MAP_LEFT = 400
const MAP_BOTTOM = 100
const MAP_COLOR = 'black'
const PLAYER1_STARTING_POSITION_X = MAP_LEFT + 50
const PLAYER1_STARTING_POSITION_Y = MAP_BOTTOM
const PLAYER2_STARTING_POSITION_X = MAP_LEFT + MAP_WIDTH - 50 - PLAYER_WIDTH
const PLAYER2_STARTING_POSITION_Y = MAP_BOTTOM
const CAR_FREQUENCY = 1000
const CAR_SPEED = 20

const positions$ = new BehaviorSubject({
    X1: PLAYER1_STARTING_POSITION_X, Y1: PLAYER1_STARTING_POSITION_Y,
    X2: PLAYER2_STARTING_POSITION_X, Y2: PLAYER2_STARTING_POSITION_Y,
})

const carPositions$ = new BehaviorSubject([])

const IsAlive$ = new BehaviorSubject(true)
const PlayersWin$ = new BehaviorSubject(false)

const isAlive = () => {
    return IsAlive$.getValue();
}

const continueGame = () => {
    return !PlayersWin$.getValue();
}


function createCar() {
    const yValue = Math.floor(Math.random() * (MAP_WIDTH - CAR_WIDTH)) + MAP_BOTTOM;
    return {
        x: MAP_LEFT,
        y: yValue <= MAP_BOTTOM + PLAYER_HEIGTH + 10 ? yValue + PLAYER_HEIGTH : yValue,
    }
}

const CarCreator$ = interval(CAR_FREQUENCY).pipe(
    map(_ => createCar()),
    tap((car) => carPositions$.next([...carPositions$.getValue(), car])),
)

const Cars$ = CarCreator$.pipe(
    scan((cars, car) => [...cars, car], []),
    map(cars => {
        cars.forEach((car) => {
            car.x += CAR_SPEED
        })
        carPositions$.next(carPositions$.getValue().map((car) => {
            car.x += CAR_SPEED;
            return car
        }));
        return cars
    }),
    share()
)


const gameMap = document.createElement('div');
gameMap.style.position = 'absolute'
gameMap.style.bottom = `${MAP_BOTTOM}px`
gameMap.style.left = `${MAP_LEFT}px`
gameMap.style.width = `${MAP_WIDTH}px`
gameMap.style.height = `${MAP_WIDTH}px`
gameMap.style.backgroundImage = 'url("calle.png")'
gameMap.style.backgroundRepeat = 'no-repeat'
gameMap.style.backgroundSize = `${MAP_WIDTH}px ${MAP_WIDTH}px`
document.body.appendChild(gameMap)

const showPlayer1 = (x, y) => {
    const player = document.createElement('img');
    player.src = 'personaje1.png'
    player.style.position='absolute'
    player.style.left = `${x}px`
    player.style.bottom = `${y}px`
    player.style.height = `${PLAYER_HEIGTH}px`
    player.style.width = `${PLAYER_WIDTH}px`
    player.classList.add('personaje1')
    document.body.appendChild(player)
}

const showPlayer2 = (x, y) => {
    const player = document.createElement('img');
    player.src = 'personaje2.png'
    player.style.position='absolute'
    player.style.left = `${x}px`
    player.style.bottom = `${y}px`
    player.style.height = `${PLAYER_HEIGTH}px`
    player.style.width = `${PLAYER_WIDTH}px`
    player.classList.add('personaje2')
    document.body.appendChild(player)
}

const showCars = (cars) => {
    cars.forEach((car) => {
        const carDom = document.createElement('img');
        carDom.src = 'car.png'
        carDom.style.position='absolute'
        carDom.style.left = `${car.x}px`
        carDom.style.bottom = `${car.y}px`
        carDom.style.height = `${CAR_WIDTH}px`
        carDom.style.width = `${CAR_WIDTH}px`
        carDom.classList.add('car')
        if (car.x >= MAP_LEFT + MAP_WIDTH) {
            carDom.style.display = 'none'
        }
        document.body.appendChild(carDom)
    })
}

const showPlayers = (x1, y1, x2, y2) => {
    showPlayer1(x1, y1)
    showPlayer2(x2, y2)
}

showPlayers(PLAYER1_STARTING_POSITION_X, PLAYER1_STARTING_POSITION_Y, PLAYER2_STARTING_POSITION_X, PLAYER2_STARTING_POSITION_Y);

const clearPlayer1 = () => {
    const player = document.querySelector('.personaje1');
    player.parentNode.removeChild(player);
}
const clearPlayer2 = () => {
    const player = document.querySelector('.personaje2');
    player.parentNode.removeChild(player);
}

clearPlayers = () => {
    clearPlayer1();
    clearPlayer2();
    const cars = document.querySelectorAll('.car');
    cars.forEach((car) => {
        car.parentNode.removeChild(car)
    })
}

const handlePlayer1Movement = ({X1, Y1}, key) => {
    if (existCollision({X1, Y1}, key, true)) {
        return {X1, Y1}
    }
    if (key === 'a') {
        return {X1: X1 - 10, Y1}
    } else if (key === 'd') {
        return {X1: X1 + 10, Y1}
    } else if (key === 'w') {
        return {X1, Y1: Y1 + 10}
    } else if (key === 's') {
        return {X1, Y1: Y1 - 10}
    } else {return {X1, Y1}}
}

const handlePlayer2Movement = ({X2, Y2}, key) => {
    if (existCollision({X2, Y2}, key, false)) {
        return {X2, Y2}
    }
    if (key === 'j') {
        return {X2: X2 - 10, Y2}
    } else if (key === 'l') {
        return {X2: X2 + 10, Y2}
    } else if (key === 'i') {
        return {X2, Y2: Y2 + 10}
    } else if (key === 'k') {
        return {X2, Y2: Y2 - 10}
    } else {return {X2, Y2}}
}

const checkOtherPlayerCollision = ({X,Y}, otherPlayer) => {
    if ((Math.abs(X - otherPlayer.X) < PLAYER_WIDTH) && (Math.abs(Y - otherPlayer.Y) < PLAYER_HEIGTH)) {
        return true
    }
    return false
}

const existCollision = (position, key, player1) => {
    if (!position && !((position.X1 && position.Y1) || (position.X2 && position.Y2))){
        return true
    }
    const X = position.X1 || position.X2;
    const Y = position.Y1 || position.Y2;
    const playerPosition = positions$.getValue();
    let otherPlayer = {}
    if (player1) {
        otherPlayer.X = playerPosition.X2
        otherPlayer.Y = playerPosition.Y2
    } else {
        otherPlayer.X = playerPosition.X1
        otherPlayer.Y = playerPosition.Y1
    }
    if (key === 'a' || key === 'j') {
        if (checkOtherPlayerCollision({X: X - 10, Y}, otherPlayer)) {
            return true;
        }
        return (X - 10 < MAP_LEFT)
    } else if (key === 'd' || key === 'l') {
        if (checkOtherPlayerCollision({X: X + 10, Y}, otherPlayer)) {
            return true;
        }
        return (X + PLAYER_WIDTH + 10 > MAP_LEFT + MAP_WIDTH)
    } else if (key === 'w' || key === 'i') {
        if (checkOtherPlayerCollision({X, Y: Y + 10}, otherPlayer)) {
            return true;
        }
        return (Y + PLAYER_HEIGTH + 10 > MAP_BOTTOM + MAP_WIDTH)
    } else if (key === 's' || key === 'k') {
        if (checkOtherPlayerCollision({X, Y: Y - 10}, otherPlayer)) {
            return true;
        }
        return (Y - 10 < MAP_BOTTOM)
    } else return true
}

const detectCarColission = (cars, {X1, Y1}, {X2, Y2}) => {
    return cars.some(car => isCarCollision(car, {X1, Y1}, {X2, Y2}));
}

const isCarCollision = (car, {X1, Y1}, {X2, Y2}) => {
    const distanceX = 35
    const distanceY = 35
    const firstPlayerCollision = distanceX > Math.abs(X1 - car.x) && Math.abs(car.y - Y1) < distanceY
    const secondPlayerCollision = distanceX > Math.abs(X2 - car.x) && Math.abs(car.y - Y2) < distanceY
    return firstPlayerCollision || secondPlayerCollision
}

const player1Movement$ = fromEvent(document, 'keyup')
                        .pipe(
                            merge(fromEvent(document, 'keydown')),
                            pluck('key'),
                            scan(handlePlayer1Movement, {X1: PLAYER1_STARTING_POSITION_X, Y1: PLAYER1_STARTING_POSITION_Y}),
                        )

const player2Movement$ = fromEvent(document, 'keyup')
                        .pipe(
                            merge(fromEvent(document, 'keydown')),
                            pluck('key'),
                            scan(handlePlayer2Movement, {X2: PLAYER2_STARTING_POSITION_X, Y2: PLAYER2_STARTING_POSITION_Y})
                        )

const Life$ = combineLatest(
    Cars$,
    player1Movement$,
    player2Movement$)
    .pipe(
    map(([cars, {X1, Y1}, {X2, Y2}]) => detectCarColission(cars, {X1, Y1}, {X2, Y2})),
    filter((bool) => bool),
    takeWhile(isAlive),
    takeWhile(continueGame)
)

const Win$ = combineLatest(
        player1Movement$,
        player2Movement$
        ).pipe(
            map(([{Y1}, {Y2}]) => (Y1 + PLAYER_HEIGTH >= MAP_BOTTOM + MAP_WIDTH)
            && (Y2 + PLAYER_HEIGTH >= MAP_BOTTOM + MAP_WIDTH) ), 
            filter(bool => bool),
            takeWhile(isAlive),
            takeWhile(continueGame)
        )

const renderGame = ({X1, Y1, X2, Y2, cars}) => {
    clearPlayers()
    showPlayers(X1, Y1, X2, Y2)
    showCars(cars)
}

const Game$ = combineLatest(player1Movement$, player2Movement$, Cars$, ({X1, Y1}, {X2, Y2}, cars) => ({X1, Y1, X2, Y2, cars})).pipe(
    tap(({X1, Y1, X2, Y2}) => positions$.next({X1, Y1, X2, Y2})),
    sample(interval(50)),
    takeWhile(isAlive),
    takeWhile(continueGame)
)

const startGame = () => {
    Game$.subscribe(renderGame);
    Life$.subscribe(() => {
        clearPlayers()
        const playerPositions = positions$.getValue()
        const cars = carPositions$.getValue()
        const {X1, Y1, X2, Y2} = playerPositions
        showPlayers(X1, Y1, X2, Y2)
        showCars(cars)
        IsAlive$.next(false)
        const loseMessage = document.createElement('div')
        loseMessage.classList.add('lose')
        loseMessage.innerText = '¡Será para la próxima! Han perdido'
        document.body.appendChild(loseMessage);
    })
    Win$.subscribe(() => {
        clearPlayers()
        const playerPositions = positions$.getValue()
        const cars = carPositions$.getValue()
        const {X1, Y1, X2, Y2} = playerPositions
        showPlayers(X1, Y1, X2, Y2)
        showCars(cars)
        PlayersWin$.next(true)
        const winMessage = document.createElement('div');
        winMessage.classList.add('win');
        winMessage.innerText = '¡Felicitaciones! Han ganado';
        document.body.appendChild(winMessage);
    })
}

startGame()

