import { emplace, update } from "$lib/emplace.ts";
import { TileColor, Tile } from "$lib/types/Tile.ts";
import { ISLAND_SIZE_THRESHOLD, N_ROWS, WORD_LENGTH } from "$lib/constants.ts";
import { MatchResult } from "$lib/types/MatchResult.ts";
import type { TileTag } from "$lib/types/TileTag";

export const boardState = $state({
    board: new Array(WORD_LENGTH).fill(0).map(() => <Tile[]>[]),

    currentColors: {
        match: TileColor.Green,
        misplaced: TileColor.Yellow,
        absent: TileColor.Gray,
    },

    nextTileId: 0n,
    guessTileIds: <bigint[]>[],
});

export const nextTileId = () => boardState.nextTileId++;

export const setNextGuessTileIds = () => {
    boardState.guessTileIds = new Array(WORD_LENGTH).fill(0).map(() => nextTileId());
};
setNextGuessTileIds();

export const removeTags = (tags: TileTag[]) => {
    for (const tag of tags) {
        const tile = boardState.board[tag.x][tag.y];
        boardState.board[tag.x][tag.y] = new Tile(tile.id, tile.color, tile.letter, null);
    }
};

export const applyTags = (tags: TileTag[]) => {
    for (const tag of tags) {
        const tile = boardState.board[tag.x][tag.y];
        boardState.board[tag.x][tag.y] = new Tile(tile.id, tile.color, tile.letter, tag.tagColor);
    }
};


export const placeNewTiles = (tiles: (Tile | null)[]) => {
    for (const [i, tile] of tiles.entries()) {
        if (tile === null) continue;

        boardState.board[i].push(tile);
    }
};


export const tilesFromMatchResults = (guess: string, results: MatchResult[], existingTiles: (Tile | null)[] | null=null) => {
    const ids = existingTiles !== null
        ? existingTiles.map(tile => tile?.id ?? null)
        : boardState.guessTileIds;

    return results.map((result, i) => {
        switch (result) {
            case MatchResult.Empty:
                return null;
            case MatchResult.Match:
                return new Tile(ids[i]!, boardState.currentColors.match, guess[i]);
            case MatchResult.Misplaced:
                return new Tile(ids[i]!, boardState.currentColors.misplaced, guess[i]);
            case MatchResult.Absent:
                return new Tile(ids[i]!, boardState.currentColors.absent, guess[i]);
        }
    });
}


export type Point = {
    x: number,
    y: number,
};

export const hashPoint = (point: Point) => {
    const dataView = new DataView(new ArrayBuffer(16));
    dataView.setFloat64(0, point.x);
    dataView.setFloat64(8, point.y);
    return (dataView.getBigUint64(0) << 8n) + (dataView.getBigUint64(8));
};


const pointIsInBoard = (x: number, y: number) => {
    if (x < 0 || x >= WORD_LENGTH) return false;
    if (y < 0 || y >= boardState.board[x].length) return false;

    return true;
};


export const locateIslands = () => {
    const islands: Point[][] = [];

    const visited = boardState.board.map(col => col.map(() => false));

    const dfsExplore = (x: number, y: number, targetColor: TileColor, currentIsland: Point[]) => {
        if (!pointIsInBoard(x, y)) return;
        if (visited[x][y]) return;

        const tile = boardState.board[x][y];
        if (tile.color !== targetColor) return;

        visited[x][y] = true;
        if ([TileColor.Gray, TileColor.Blue].includes(tile.color)) return;

        currentIsland.push({x, y});
        
        dfsExplore(x - 1, y, targetColor, currentIsland);
        dfsExplore(x + 1, y, targetColor, currentIsland);
        dfsExplore(x, y - 1, targetColor, currentIsland);
        dfsExplore(x, y + 1, targetColor, currentIsland);
    };

    for (let x = 0; x < WORD_LENGTH; x++) {
        for (let y = 0; y < boardState.board[x].length; y++) {
            const lookingForColor = boardState.board[x][y].color;

            const currentIsland: Point[] = [];
            dfsExplore(x, y, lookingForColor, currentIsland);

            if (currentIsland.length >= ISLAND_SIZE_THRESHOLD) {
                islands.push(currentIsland);
            }
        }
    }

    return islands;
};

export const getBlueTileCrossRange = (start: Point) => {
    const points: Point[] = [start];

    const add = (x: number, y: number) => {
        if (!pointIsInBoard(x, y)) return;
        if (boardState.board[x][y].color === TileColor.Blue) return;
        points.push({x, y});
    };

    add(start.x - 3, start.y);
    add(start.x - 2, start.y);
    add(start.x - 1, start.y);
    add(start.x + 1, start.y);
    add(start.x + 2, start.y);
    add(start.x + 3, start.y);
    add(start.x, start.y - 3);
    add(start.x, start.y - 2);
    add(start.x, start.y - 1);
    add(start.x, start.y + 1);
    add(start.x, start.y + 2);

    return(points);
};

export const getIslandOfColor = (start: Point, color: TileColor) => {
    const island: Point[] = [];

    const visited = boardState.board.map(col => col.map(() => false));

    const dfsExplore = (x: number, y: number) => {
        if (!pointIsInBoard(x, y)) return;
        if (visited[x][y]) return;

        const tile = boardState.board[x][y];
        if (hashPoint(start) !== hashPoint({x, y}) && tile.color !== color) return;

        visited[x][y] = true;

        island.push({x, y});
        
        dfsExplore(x - 1, y);
        dfsExplore(x + 1, y);
        dfsExplore(x, y - 1);
        dfsExplore(x, y + 1);
    };

    dfsExplore(start.x, start.y);

    return island;
};

export const getAdjacentTiles = (islands: Point[][], onlyGray: boolean=false) => {
    const eliminatedGrays: Point[] = [];

    const visited = boardState.board.map(col => col.map(() => false));

    const checkGray = (x: number, y: number) => {
        if (!pointIsInBoard(x, y)) return;
        if (visited[x][y]) return;

        visited[x][y] = true;
        const tile = boardState.board[x][y];
        if (onlyGray && tile.color !== TileColor.Gray) return;
        if (tile.color === TileColor.Blue) return;

        eliminatedGrays.push({x, y});
    };

    for (const island of islands) {
        for (const point of island) {
            const {x, y} = point;
            // checkGray(x - 1, y - 1);
            checkGray(x - 1, y);
            // checkGray(x - 1, y + 1);
            checkGray(x, y - 1);
            checkGray(x, y + 1);
            // checkGray(x + 1, y - 1);
            checkGray(x + 1, y);
            // checkGray(x + 1, y + 1);
        }
    }

    return eliminatedGrays;
};

export const destroyTiles = (...tileCoords: Point[]) => {
    const eliminatedPoints = new Set(tileCoords.map(point => hashPoint(point)));

    boardState.board = boardState.board.map(
        (col, x) => col.filter((_, y) => !eliminatedPoints.has(hashPoint({x, y})))
    );
};

const hasBlueTiles = () => {
    return boardState.board.some(column => column.some(tile => tile.color === TileColor.Blue));
};

export const hasColumnAtTop = () => boardState.board.some(column => column.length >= N_ROWS);

export const isGameOver = () => !hasBlueTiles() && hasColumnAtTop();

export const allBlueTileCoords = function* () {
    const maxColumnHeight = Math.max(...boardState.board.map(column => column.length));

    for (let y = maxColumnHeight - 1; y >= 0; y--) {
        for (const [x, column] of boardState.board.entries()) {
            if (y >= column.length) continue;
            if (column[y].color !== TileColor.Blue) continue;

            yield {x, y};
        }
    }
};


export const resetGameState = () => {
    boardState.board = new Array(WORD_LENGTH).fill(0).map(() => []);

    boardState.currentColors = {
        match: TileColor.Green,
        misplaced: TileColor.Yellow,
        absent: TileColor.Gray,
    };

    setNextGuessTileIds();
};