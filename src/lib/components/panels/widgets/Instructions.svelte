<script>
    import { ISLAND_SIZE_THRESHOLD } from "$lib/constants";
    import { uiState } from "$lib/state/uiState.svelte";
    import { TileColor } from "$lib/types/Tile";
    import MiniTile from "./parts/MiniTile.svelte";
    import { elasticOut } from "svelte/easing";
    import { halfFlipRight } from "#/transition";

</script>
<instructions-text>
    <p>
        Create groups of {ISLAND_SIZE_THRESHOLD} <MiniTile tileColor={TileColor.Green} smaller />
        or {ISLAND_SIZE_THRESHOLD} <MiniTile tileColor={TileColor.Yellow} smaller /> to destroy them!
    </p>

    <p>
        Destroy <MiniTile tileColor={TileColor.Gray} smaller /> by making groups next to them!
    </p>

    {#if uiState().discoveredBlueTiles}
        <p in:halfFlipRight={{duration: 4000, easing: elasticOut}}>
            Click a <MiniTile tileColor={TileColor.Blue} smaller /> to choose how it destroys tiles!
        </p>

        <p in:halfFlipRight={{duration: 4000, delay: 1000, easing: elasticOut}}>
            Rows still on the board will give you hints for the new word.
        </p>
    {/if}

    <!-- <p>
        Groups will destroy nearby <MiniTile matchResult={MatchResult.Absent} smaller />!
    </p>

    <p>
        If the timer runs out, more <MiniTile matchResult={MatchResult.Absent} smaller /> will drop!
    </p> -->
</instructions-text>

<style lang="scss">
* {
    transform-style: preserve-3d;
}

instructions-text {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

p {
    margin: 0;
    backface-visibility: hidden;
}
</style>