<script lang="ts">
import PudleTitle from "./PudleTitle.svelte";
import RightPanel from "@/lib/components/panels/RightPanel.svelte";
import LeftPanel from "@/lib/components/panels/LeftPanel.svelte";
import Keyboard from "@/lib/components/board/Keyboard.svelte";
import Letterboard from "@/lib/components/board/Letterboard.svelte";
import { fade } from "svelte/transition";
import { onDataLoad, uiState } from "../state/uiState.svelte";
import { setupInitialLoad } from "../state/initialLoadState.svelte";
import { onMount } from "svelte";
import { addMessage, NoticeMessage, noticeState } from "../state/noticeState.svelte";
    import { statsState } from "../state/statsState.svelte";
    import SettingsPanel from "./panels/SettingsPanel.svelte";
    import RightPanelOnlySettingsButton from "./panels/RightPanelOnlySettingsButton.svelte";
    import { TileColor } from "../types/Tile";
    import MiniTile from "./panels/widgets/parts/MiniTile.svelte";

const removeLoadingMessage = addMessage(NoticeMessage.Loading);

onMount(async () => {
    try {
        await setupInitialLoad();
    } catch {
        removeLoadingMessage();

        addMessage(NoticeMessage.LoadingFailed);
        return;
    }

    removeLoadingMessage();
    onDataLoad();
});
</script>

<game-page>
    <PudleTitle fades />

    <Keyboard />

    <Letterboard />
    
    {#if !statsState().isFirstGuess}
        <LeftPanel />

        <RightPanel />
    {/if}

    <right-panel-only-instructions>
        <p>
            Guess a 5-letter word!
        </p>
        
        <p>
            <MiniTile tileColor={TileColor.Green} smaller /> = Correct letter!
        </p>

        <p>
            <MiniTile tileColor={TileColor.Yellow} smaller /> = Letter in wrong position
        </p>

        <p>
            <MiniTile tileColor={TileColor.Gray} smaller /> = Letter not in word
        </p>
    </right-panel-only-instructions>

    <RightPanelOnlySettingsButton />

    {#if uiState().paused}
        <SettingsPanel />
    {/if}
</game-page>

<style lang="scss">
@import "#/constants.scss";

* {
    transform-style: preserve-3d;
}

game-page {
    display: grid;
    align-items: center;
    justify-items: center;

    grid-template-columns: 15rem auto 15rem;
    grid-template-rows: auto auto auto auto auto 5rem;
    margin: 0 -6rem;

    row-gap: 0;
    column-gap: 2rem;
}

right-panel-only-instructions {
    grid-area: 2/3 / 3/4;
    align-self: start;
    justify-self: start;

    transform: rotateY(-35deg) scale(var(--scale-fac));
    transform-origin: left;
    backface-visibility: hidden;


    --scale-fac: 1;
    @media screen and (max-width: $small-width) {
        --scale-fac: 0.75;
    }
}
</style>