import { placeNewTiles, boardState, locateIslands, type Point, getAdjacentTiles, destroyTiles, setNextGuessTileIds, isGameOver, applyTags, tilesFromMatchResults, removeTags, resetGameState, getIslandOfColor, getBlueTileCrossRange, hasColumnAtTop, allBlueTileCoords, hashPoint } from "./boardState.svelte.ts";
import { Tile, TileColor } from "$lib/types/Tile.ts";
import { guessedCorrectly, matchResults, isValidGuess, nextWord, recordGuessResults, updateKnownLetterInfo, getRoundStateResetter, roundState, invalidGuessMessage } from "./roundState.svelte.ts";
import { TileTag } from "$lib/types/TileTag.ts";
import { MatchResult } from "$lib/types/MatchResult.ts";
import { GUESS_TIME_BY_GUESS_NO_DECAY_FAC, GUESS_TIME_BY_WORD_NO_DECAY_FAC, MAX_TIME_LIMIT_S_BY_WORD_NO, MIN_TIME_DECAY_LIMIT_S_BY_GUESS_NO, MIN_TIME_LIMIT_S_BY_WORD_NO, WORD_LENGTH, MAX_TIME_DECAY_LIMIT_S_BY_GUESS_NO, EMPTY_TILE_CHAR, N_ROWS, PAR_GUESSES_PER_WORD } from "$lib/constants.ts";
import { pauseTimer, resetTimerState, restartTimer, setTimeLimit, resumeTimer, timerState } from "./timerState.svelte.ts";
import { NoticeMessage, noticeState, addTemporaryMessage, addMessage, emitMessage } from "./noticeState.svelte.ts";
import { incrementNthGuess, incrementNthWord, resetStatsState, statsState } from "./statsState.svelte.ts";


const state = $state({
    guess: "",
    boardsLocked: true,
    flipping: false,
    guessTiles: <Tile[]>[],


    previewRange: <Set<bigint> | null>null,

    gameOver: false,
    paused: false,


    discoveredBlueTiles: false,
    selectingBlueTile: false,
    currentBlueTileSelectionResolver: <((index: number | PromiseLike<number>) => void) | null>null,
});

const stateDerived = $derived({
    guess: state.guess,
    boardsLocked: state.boardsLocked,
    inputLocked: state.boardsLocked || state.paused,
    flipping: state.flipping,
    guessTiles: state.guessTiles,


    previewRange: state.previewRange,

    gameOver: state.gameOver,
    paused: state.paused,

    discoveredBlueTiles: state.discoveredBlueTiles,
    selectingBlueTile: state.selectingBlueTile,
    currentBlueTileSelectionResolver: state.currentBlueTileSelectionResolver,

    nextColumnBlocked: state.guess.length >= WORD_LENGTH
        ? true
        : boardState.board[state.guess.length].length >= N_ROWS,
    firstBlockedColumnIndex: (() => {
        const index = boardState.board.findIndex(column => column.length >= N_ROWS);
        return index === -1 ? null : index;
    })(),
});

export const uiState = () => stateDerived;

export const onDataLoad = () => {
    state.boardsLocked = false;
};

const resetGuessTiles = (mockGuess=state.guess) => {
    state.guessTiles = mockGuess
        .padEnd(WORD_LENGTH, EMPTY_TILE_CHAR)
        .split("")
        .map((char, i) => new Tile(boardState.guessTileIds[i], TileColor.Empty, char === EMPTY_TILE_CHAR ? "" : char));
};

type ExistingRowEvaluation = {
    y: number,
    mockGuess: string,
    results: MatchResult[],
    existingTiles: Tile[],
};

const reevaluateExistingRows = function* () {
    const maxColumnHeight = Math.max(...boardState.board.map(column => column.length));
    for (let y = 0; y < maxColumnHeight; y++) {
        const existingTiles = boardState.board.map(column => column[y] ?? null);
        const mockGuess = existingTiles.map(tile => tile?.letter ?? EMPTY_TILE_CHAR).join("");

        const results = matchResults(mockGuess);

        yield {y, mockGuess, results, existingTiles};
    }
};

const checkIfTilesNeedTagging = (evaluations: ExistingRowEvaluation[]) => {
    const tags: TileTag[] = [];

    for (const {y, mockGuess, results, existingTiles} of evaluations) {
        const tiles = tilesFromMatchResults(mockGuess, results, existingTiles);

        for (const [x, tile] of tiles.entries()) {
            if (tile === null) continue;

            const existingTile = boardState.board[x][y];

            if (tile.color === existingTile.tagColor) continue;
            tags.push(new TileTag(x, y, existingTile, tile.color));
        }
    }

    return tags;
};

const updateInfoFromReevaluation = (evaluations: ExistingRowEvaluation[]) => {
    for (const {mockGuess, results} of evaluations) {
        updateKnownLetterInfo(mockGuess, results);
    }
};

resetGuessTiles();

const wait = (ms: number=0) => new Promise(resolve => {
    setTimeout(resolve, ms);
});

const locateAndDestroyLargeGroups = async () => {
    let destroyed = false;

    while (true) {
        const islands = locateIslands();
        if (islands.length === 0) break;

        const grays = getAdjacentTiles(islands, true);
        
        await wait(750);
        
        destroyTiles(...islands.flat(), ...grays);
        destroyed = true;
    }

    if (destroyed) {
        await wait(250);
    }
};

const nextGuessTimeLimitDerived = $derived.by(() => {
    // 3d: https://www.desmos.com/3d/md08iio16o
    // 2d: https://www.desmos.com/calculator/jledjyjotv

    const usedWordCount = ((statsState().nthWord - 1) + (statsState().nthGuess - roundState.guessedWords.size - 1) / PAR_GUESSES_PER_WORD) / 2;

    const maxTimeLimitByWordNo = MIN_TIME_LIMIT_S_BY_WORD_NO + 2 * (MAX_TIME_LIMIT_S_BY_WORD_NO - MIN_TIME_LIMIT_S_BY_WORD_NO) / (1 + Math.exp(usedWordCount * GUESS_TIME_BY_WORD_NO_DECAY_FAC));
    const minTimeLimitByWordNo = MIN_TIME_DECAY_LIMIT_S_BY_GUESS_NO + 2 * (MAX_TIME_DECAY_LIMIT_S_BY_GUESS_NO - MIN_TIME_DECAY_LIMIT_S_BY_GUESS_NO) / (1 + Math.exp(usedWordCount * GUESS_TIME_BY_WORD_NO_DECAY_FAC));
    const timeLimitByGuessNo = minTimeLimitByWordNo + 2 * (maxTimeLimitByWordNo - minTimeLimitByWordNo) / (1 + Math.exp((roundState.guessedWords.size - 1) * GUESS_TIME_BY_GUESS_NO_DECAY_FAC));

    return timeLimitByGuessNo * 1000;
});

export const nextGuessTimeLimit = () => nextGuessTimeLimitDerived;

const garbageWords = [
    ">.=.<",
    "<.=.<",
    ">.=.>",
    "@.=.@",
    "x.=.x",
    "o.=.o",
    ">..<\"",
    "<..<\"",
    ">..>\"",
    "@..@\"",
    "x..x\"",
    "o..o\"",
    "o'w'o",
    "x'w'x",
    ">'w'<",
    "<'w'<",
    ">'w'>",
    "@'w'@",
];

const chooseGarbageWord = () => {
    return garbageWords[Math.floor(Math.random() * garbageWords.length)];
};

const dropGarbage = async () => {
    state.boardsLocked = true;
    stopPreviewBlueTileRange();
    pauseTimer();

    const lastGuess = state.guess;
    
    for (const {x, y} of allBlueTileCoords()) {
        if (!hasColumnAtTop()) break;

        await wait(500);

        await executeBlueTileAction(x, y, BlueTileAction.Cross);
    }

    let {shouldContinue} = await boardChangeChecks();
    if (!shouldContinue) return;

    state.guess = chooseGarbageWord().padEnd(WORD_LENGTH, "_").slice(0, WORD_LENGTH);
    await execConsumeGuess(true);

    ({shouldContinue} = await boardChangeChecks());
    if (!shouldContinue) return;

    state.guess = lastGuess.slice(0, stateDerived.firstBlockedColumnIndex ?? WORD_LENGTH);
    resetGuessTiles();


    state.boardsLocked = false;
    restartTimer(dropGarbage, nextGuessTimeLimitDerived);
};

/**
 * To be called whenever the board gets rearranged after eliminating tiles
 * @returns 
 */
const boardChangeChecks = async () => {
    const evaluationsOfExistingRows = [...reevaluateExistingRows()];

    const tags = checkIfTilesNeedTagging(evaluationsOfExistingRows);
    if (!statsState().isFirstGuess) {
        updateInfoFromReevaluation(evaluationsOfExistingRows);
    }


    if (tags.length > 0) {
        removeTags(tags);

        await wait(500);
        
        applyTags(tags);
    }


    if (isGameOver()) {
        await wait(500);

        state.gameOver = true;
        return {shouldContinue: false, evaluationsOfExistingRows};
    }

    return {shouldContinue: true, evaluationsOfExistingRows};
};

const requestBlueTileSelection = async () => {
    const {promise, resolve} = Promise.withResolvers<number>();
    state.currentBlueTileSelectionResolver = resolve;
    const removeMessage = addMessage(NoticeMessage.SelectBlueTile);

    const index = await promise;

    state.currentBlueTileSelectionResolver = null;
    removeMessage();

    return index;
};

const execConsumeGuess = async (isGarbage=false) => {
    const results = matchResults(state.guess);
    let tiles = <Tile[]>tilesFromMatchResults(state.guess, results);

    state.boardsLocked = true;
    stopPreviewBlueTileRange();
    state.flipping = true;
    state.guessTiles = tiles;

    await wait(statsState().isFirstGuess ? 2250 : 875); // wait for the flipping animation

    if (results.every(result => result === MatchResult.Match)) {
        await wait(250);

        state.selectingBlueTile = true;
        const blueTileIndex = await requestBlueTileSelection();

        const originalTile = tiles[blueTileIndex];
        tiles[blueTileIndex] = new Tile(originalTile.id, TileColor.Blue, originalTile.letter, originalTile.tagColor);
        
        state.guessTiles = tiles;

        await wait(250);

        state.discoveredBlueTiles = true;
    }

    if (!isGarbage && !statsState().isFirstGuess) {
        updateKnownLetterInfo(state.guess, results); // delay this until later for the first guess
    }
    placeNewTiles(tiles);
    if (!isGarbage) {
        recordGuessResults(state.guess, results);
    }

    state.selectingBlueTile = false;
    state.flipping = false;
    resetGuessTiles(""); // make sure the letters don't render in their original spots

    await wait(statsState().isFirstGuess ? 1500 : 500); // falling animation

    setNextGuessTileIds();
    resetGuessTiles(""); // switch to the new ids of the guess tiles

    await locateAndDestroyLargeGroups();

    if (guessedCorrectly(state.guess)) {
        await wait(500);

        await nextWord();
        incrementNthWord();
    }

    await wait(250);

    const {shouldContinue, evaluationsOfExistingRows} = await boardChangeChecks();
    if (!shouldContinue) return {shouldContinue};

    if (statsState().isFirstGuess) {
        updateKnownLetterInfo(state.guess, results);
        updateInfoFromReevaluation(evaluationsOfExistingRows);
    }

    return {
        shouldContinue: true,
    };
}

export const consumeGuess = async () => {
    if (stateDerived.inputLocked) return;
    if (!await isValidGuess(state.guess)) {
        const message = await invalidGuessMessage(state.guess);
        if (message === null) return;

        addTemporaryMessage(message);
        return;
    }

    pauseTimer();

    const {shouldContinue} = await execConsumeGuess();
    if (!shouldContinue) return;

    restartTimer(dropGarbage, nextGuessTimeLimitDerived);

    incrementNthGuess();
    state.guess = "";
    state.boardsLocked = false;
};

export const backspaceGuess = () => {
    if (stateDerived.inputLocked) return;

    state.guess = state.guess.slice(0, -1);
    resetGuessTiles();
};

export const extendGuess = (char: string) => {
    if (stateDerived.inputLocked) return;
    if (state.guess.length >= WORD_LENGTH) return;
    if (stateDerived.nextColumnBlocked) {
        emitMessage(NoticeMessage.ColumnBlocked);
        return;
    }

    state.guess += char;
    resetGuessTiles();
};

export enum BlueTileAction {
    DestroyGreen,
    DestroyYellow,
    Cross,
}

const getBlueTileRange = (x: number, y: number, action: BlueTileAction) => {
    switch (action) {
        case BlueTileAction.Cross:
            return {
                island: getBlueTileCrossRange({x, y}),
                adjacents: [],
            };

        case BlueTileAction.DestroyGreen:
        case BlueTileAction.DestroyYellow: {
            const color = action === BlueTileAction.DestroyGreen
                ? TileColor.Green
                : TileColor.Yellow;

            const island = getIslandOfColor({x, y}, color);
            const adjacents = getAdjacentTiles([island], false);

            return {island, adjacents};
        }
    }
};

const executeBlueTileAction = async (x: number, y: number, action: BlueTileAction) => {
    const {island, adjacents} = getBlueTileRange(x, y, action);

    if ([BlueTileAction.DestroyGreen, BlueTileAction.DestroyYellow].includes(action)) {
        for (const {x, y} of island) {
            const tile = boardState.board[x][y]
            boardState.board[x][y] = new Tile(tile.id, TileColor.BlueFlash, tile.letter, null);
        }

        await wait(500);
    }

    destroyTiles(...island, ...adjacents);

    await wait(500);

    await locateAndDestroyLargeGroups();

    const {shouldContinue} = await boardChangeChecks();
    return {shouldContinue};
};

export const blueTileAction = async (x: number, y: number, action: BlueTileAction) => {
    if (state.boardsLocked) return;

    state.boardsLocked = true;
    stopPreviewBlueTileRange();

    pauseTimer();

    const {shouldContinue} = await executeBlueTileAction(x, y, action);
    if (!shouldContinue) return;

    resumeTimer(dropGarbage);
    state.boardsLocked = false;
};

export const previewBlueTileRange = (x: number, y: number, action: BlueTileAction) => {
    const {island, adjacents} = getBlueTileRange(x, y, action);
    state.previewRange = new Set([...island, ...adjacents].map(hashPoint));
};

export const stopPreviewBlueTileRange = () => {
    state.previewRange = null;
};

let timerWasPausedWhenGamePaused = false;
export const pauseGame = () => {
    if (state.paused) return;

    timerWasPausedWhenGamePaused = timerState.paused;
    state.paused = true;
    if (!timerWasPausedWhenGamePaused) {
        pauseTimer();
    }
};

export const unpauseGame = () => {
    if (!state.paused) return;

    state.paused = false;
    if (!timerWasPausedWhenGamePaused) {
        resumeTimer(dropGarbage);
    }
};

export const reset = async () => {
    const resetRoundState = await getRoundStateResetter();
    resetGameState();
    resetTimerState();
    resetRoundState();
    resetStatsState();

    setTimeLimit(MAX_TIME_LIMIT_S_BY_WORD_NO * 1000);
    
    state.guess = "";
    state.boardsLocked = false;
    state.flipping = false;
    state.previewRange = null;

    state.gameOver = false;
    state.paused = false;

    state.selectingBlueTile = false;
    state.currentBlueTileSelectionResolver = null;

    resetGuessTiles();
};