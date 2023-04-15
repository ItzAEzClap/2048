const container = document.getElementById('container')
const gameContainer = document.getElementById('game-container')
const gridContainer = document.getElementById('grid-container')
const newGame = document.getElementById('newGame') // Geometry Dash Time Shell
const currentScore = document.getElementById('current-score')
const bestScore = document.getElementById('best-score')
const boardSize = 4
const tileBg = {
    2: [238,228,218],
    4: [238,225,201],
    8: [243, 178, 122],
    16: [246, 150, 100],
    32: [247, 124, 95],
    64: [247, 95, 59],
    128: [237, 207, 114],
    256: [237, 204, 97],
    512: [237, 200, 80],
    1024: [237, 197, 63],
    2048: [237, 194, 46]
}

const tileColors = {
    2: [119, 110, 101],
    4: [119, 110, 101]
}

const rotations = {
    'w': 0,
    'a': 1,
    's': 2,
    'd': 3,
    'arrowup': 0,
    'arrowleft': 1,
    'arrowdown': 2,
    'arrowright': 3
}

const animationOfMerge = (element) => 
element.animate({ transform: ['scale(0)', 'scale(1.1)', 'scale(1)'] }, { duration: 100 }).finished

const animationOfMove = (element, dy, dx) => element.animate([
    { transform: 'translate(0px, 0px)' },
    { transform: `translate(${dx}px, ${dy}px)` }
], {
    duration: 100,
    easing: 'cubic-bezier(0.70, 0, 0.55, 0.50)',
}).finished

const animationOfAdd = (element) => element.animate([
    { transform: 'translate(0px, 0px)', opacity: 1 },
    { transform: `translate(0px, ${getComputedStyle(document.documentElement).getPropertyValue('--javascriptMin')}`, opacity: 0 }
], { duration: 400 }).finished
/*-------------------------*/
let normal = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / 45
let board = Array.from(Array(boardSize), () => Array.from(Array(boardSize)).fill(0))
let waitingForAnimation = false
let movement = {}
let merges = []
let totalScore = 0

function createKeyframes(type) {
    let prefix = ""
    if (type === '') {}
}

// Game Tile
function getChild(y, x) {
    return getParent(y, x).childNodes[0]
}

function getParent(y, x) {
    return document.getElementsByClassName('grid-row')[y].getElementsByClassName('grid-cell')[x]
}

async function addTile() {
    let emptySquares = []
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!board[y][x]) { emptySquares.push([y, x]) }
        }
    }
    if (emptySquares.length === 0) { return false }
    let i = Math.floor(Math.random() * emptySquares.length)
    let [y, x] = emptySquares[i]
    let value = Math.random() < 0.9 ? 2 : 4
    createTile(value, y, x)
    return true
}

function createTile(value, y, x) {
    board[y][x] = value
    let div = document.createElement('div')
    div.textContent = value
    div.className = 'game-tile'
    div.dataset.y = y
    div.dataset.x = x
    div.style.color = `rgb(${(tileColors[value] || [249, 246, 242]).join(', ')})`
    div.style.backgroundColor = `rgb(${(tileBg[value] || [0, 0, 0]).join(', ')})`

    let parent = getParent(y, x)
    parent.appendChild(div)

    animationOfMerge(div)
}

// Rotation
function rotatePoint(y, x, times) {
    for (let _ = 0; _ < times; _++)  {
        let temp = y
        y = x
        x = boardSize - temp - 1
    }
    return [y, x]
}

function rotateBoard(times) {
    let temp = Array.from(Array(boardSize), () => Array.from(Array(boardSize)).fill(0))
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            let [newY, newX] = rotatePoint(y, x, times)
            temp[newY][newX] = board[y][x]
        }
    }
    board = structuredClone(temp)
}

// Movement
function getKeyFromValue(y, x) {
    for (let key of Object.keys(movement)) {
        let value = movement[key]
        if (value.join(',') === `${y},${x}`) { return key.split(',').map(e => parseInt(e)) }
    }
}

function compress() {
    let space = Array.from(Array(boardSize)).fill(0)
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!board[y][x]) { space[x]++; continue }
            if (space[x]) {
                board[y - space[x]][x] = board[y][x]
                board[y][x] = 0
    
                let [keyY, keyX] = getKeyFromValue(y, x)
                movement[[keyY, keyX]] = [y - space[x], x]
            }
        }
    }
}

function merge() {
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!board[y][x]) { continue }
            if (y - 1 >= 0 && board[y][x] === board[y - 1][x]) {
                board[y - 1][x] *= 2
                board[y][x] = 0
                
                let [fromY, fromX] = getKeyFromValue(y, x)
                let [intoY, intoX] = getKeyFromValue(y - 1, x)

                merges.push([[fromY, fromX], [intoY, intoX]]) // Merge: [[From], [Into]]
                delete movement[[fromY, fromX]]
            }
        }
    }
}

// Animation
async function playScoreAnimation(score) {
    let h2 = document.createElement('h2')
    h2.textContent = `+${score}`
    h2.className = 'add-score'
    
    currentScore.appendChild(h2)
    await animationOfAdd(h2)
    try { currentScore.removeChild(h2) } catch {}
}

async function playMergeAnimation(y1, x1, y2, x2, y3, x3) { // y1 x1 First, y2 x2 Second, y3 x3 Destination
    let main = getChild(y1, x1)
    let secondary = getChild(y2, x2)
    let parent = getParent(y3, x3)

    await Promise.all([playMoveAnimation(y1, x1, y3, x3), playMoveAnimation(y2, x2, y3, x3)])
    parent.removeChild(secondary)

    main.textContent *= 2
    main.style.color = `rgb(${(tileColors[main.textContent] || [249, 246, 242]).join(', ')})`
    main.style.backgroundColor = `rgb(${(tileBg[main.textContent] || [251,
        228 - 27 * Math.log2(main.textContent) > 0 ? 228 - 27 * Math.log2(main.textContent) : 0,
        218 - 32 * Math.log2(main.textContent) > 0 ? 218 - 32 * Math.log2(main.textContent) : 0
    ]).join(', ')})`

    totalScore += parseInt(main.textContent)

    await animationOfMerge(main)
}

async function playMoveAnimation(y1, x1, y2, x2) {
    let oldParent = getParent(y1, x1)
    let newParent = getParent(y2, x2)
    let element =  getChild(y1, x1)

    let initialPosition = element.getBoundingClientRect()
    newParent.appendChild(element)
    let newPosition = element.getBoundingClientRect()
    oldParent.appendChild(element)

    let dy = newPosition.top - initialPosition.top
    let dx = newPosition.left - initialPosition.left

    await animationOfMove(element, dy, dx)
    newParent.appendChild(element)
}

function createAnimations() {
    let animations = []
    for (const merge of merges) {
        let from = merge[0]
        let into = merge[1]

        animations.push(['playMergeAnimation', [...from, ...into, ...movement[into]]])

        delete movement[from]
        delete movement[into]
    }

    for (let [key, value] of Object.entries(movement)) {
        if (key !== value.join(',')) {
            key = key.split(',').map(e => parseInt(e))
            animations.push(['playMoveAnimation', [...key, ...value]])
        }
    }
    return animations
}

function rotateAnimations(animations, rotation) {
    for (let j = 0; j < animations.length; j++) {
        let [y1, x1] = rotatePoint(animations[j][1][0], animations[j][1][1], rotation)
        let [y2, x2] = rotatePoint(animations[j][1][2], animations[j][1][3], rotation)

        if (animations[j][0] === 'playMergeAnimation') {
            let [y3, x3] = rotatePoint(animations[j][1][4], animations[j][1][5], rotation)
            animations[j][1] = [y1, x1, y2, x2, y3, x3]
        } else {
            animations[j][1] = [y1, x1, y2, x2]
        }
    }
    return animations
}

async function runAnimations(animations) {
    await Promise.all(animations.map(async animation => {
        let type = animation[0];
        let arguments = animation[1];
        await window[type](...arguments);
    }))
    currentScore.textContent = parseInt(currentScore.textContent) + totalScore
    bestScore.textContent = Math.max(parseInt(currentScore.textContent), parseInt(bestScore.textContent))
    localStorage.setItem('current-score', currentScore.textContent)
    localStorage.setItem('best-score', bestScore.textContent)

    if (totalScore) { playScoreAnimation(totalScore) }
    totalScore = 0
}

// Load
function loadBoard(save) {
    save = save.split(',')
    save.forEach((e, i) => {
        let y = Math.floor(i / boardSize)
        let x = i % boardSize
        let value = parseInt(e)
        if (!value) { return }
        createTile(value, y, x)
        board[y][x] = value
    })
}

// Game Over
function checkGameOver() {
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!board[y][x]) { return false }
            if (y - 1 >= 0 && board[y][x] === board[y - 1][x]) { return false }
            if (x - 1 >= 0 && board[y][x] === board[y][x - 1]) { return false }
            if (y + 1 < boardSize && board[y][x] === board[y + 1][x]) { return false }
            if (x + 1 < boardSize && board[y][x] === board[y][x + 1]) { return false }
        }
    }
    return true
}

async function gameOver() {
    localStorage.removeItem('board')
    localStorage.removeItem('current-score')
    // Create Structure
    let div = document.createElement('div')
    let h1 = document.createElement('h1')
    let btn = document.createElement('button')
    div.appendChild(h1)
    div.appendChild(btn)
    document.body.appendChild(div)

    /* Style */
    div.id = 'game-over-box'
    h1.id = 'game-over-text'
    h1.textContent = 'Game Over!'
    btn.id = 'game-over-btn'
    btn.className = 'restart'
    btn.textContent = "Try again!";
    btn.addEventListener('click', resetGame)

    const options = { duration: 1000, fill: "forwards" }
    await Promise.all([
        div.animate({ backgroundColor: ['rgba(250, 248, 239, 0)', 'rgba(250, 248, 239, 0.4)'] }, options).finished,
        h1.animate({ opacity: [0, 1] }, options).finished,
        btn.animate({ opacity: [0, 1] }, options).finished
    ])
}

function resetGame() {
    let gameOverDiv = document.getElementById('game-over-box')
    try { document.body.removeChild(gameOverDiv) } catch {}

    let cells = document.getElementsByClassName('grid-cell')
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            board[y][x] = 0
            cells[boardSize * y + x].innerHTML = ''
        }
    }
    currentScore.textContent = 0
    addTile()
    addTile()
    localStorage.setItem('board', board)
    localStorage.setItem('current-score', 0)
    let div = document.getElementById('game-over')
    if (div) { container.removeChild(div) }
}

async function inputMove(input) {
    let rotation = rotations[input]
    if (rotation === undefined || waitingForAnimation) { return }

    movement = {}
    merges = []

    rotateBoard(rotation)
    Array.from(document.getElementsByClassName('game-tile')).forEach(tile => {
        let [y, x] = rotatePoint(parseInt(tile.dataset.y), parseInt(tile.dataset.x), rotation)
        movement[[y, x]] = [y, x]
    })

    // Move Pieces
    compress()
    merge()
    compress()
    animations = createAnimations()

    let returnRotation = (4 - rotation) % 4
    rotateBoard(returnRotation)
    animations = rotateAnimations(animations, returnRotation)
    
    if (!animations.length) { return }

    waitingForAnimation = true
    await runAnimations(animations)
    addTile()

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (!board[y][x]) { continue }
            let child = getChild(y, x)
            child.dataset.y = y
            child.dataset.x = x
        }
    }
    if (checkGameOver()) {
        gameOver()
    } else {
        localStorage.setItem('board', board)
    }
    waitingForAnimation = false
}

newGame.addEventListener('click', resetGame)
/* Movement */
// Keyboard
window.addEventListener('keydown', (e) => {
    let key = e.key.toLowerCase()
    inputMove(key)
})

let start, end
// Touch
window.addEventListener('touchstart', (e) => {
    if (e.target.nodeName !== 'BUTTON') {
        start = [e.touches[0].clientX, e.touches[0].clientY]
    }
})
window.addEventListener('touchmove', (e) => end = [e.touches[0].clientX, e.touches[0].clientY])
window.addEventListener('touchend', () => {
    if (!start) { return }
    end = end || start
    let dx = end[0] - start[0]
    let dy = end[1] - start[1]
    if (Math.sqrt(dx * dx + dy * dy) < normal) { return }
    let input = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w')
    inputMove(input)
    start = end = undefined
})
// Mouse
window.addEventListener('mousedown', (e) => {
    if (e.target.nodeName !== 'BUTTON') {
        start = [e.clientX, e.clientY]
    }
})
window.addEventListener('mouseup', (e) => {
    if (!start) { return }
    let dx = e.clientX - start[0]
    let dy = e.clientY - start[1]
    if (Math.sqrt(dx * dx + dy * dy) < normal) { return }
    let input = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : (dy > 0 ? 's' : 'w')
    inputMove(input)
    start = end = undefined
})
/* General */
window.addEventListener('resize', () => {
    normal = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / 45
})

window.addEventListener('DOMContentLoaded', () => {
    let save = localStorage.getItem('board')
    if (save) {
        loadBoard(save)
    } else {
        addTile()
        addTile()
    }
    currentScore.textContent = localStorage.getItem('current-score') || 0
    bestScore.textContent = localStorage.getItem('best-score') || 0
})



window.addEventListener('load', () => {
    const animation = newGame.animate(
        [
            { transform: 'translate(0, 600px)' }
        ],
        { duration: 1000, easing: 'linear' }
    )
        newGame.style.webkitAnimation = animation
})

