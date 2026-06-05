<script lang="ts">
    import { cubicIn, cubicOut, elasticOut } from "svelte/easing";
    import PrevGuessesDisplay from "./widgets/prev-guesses-display/PrevGuessesDisplay.svelte";
    import { fade, fly } from "svelte/transition";
    import { halfFlipLeft, halfFlipRight } from "#/transition";
    import Instructions from "./widgets/Instructions.svelte";
    import { uiState } from "@/lib/state/uiState.svelte";
    import { roundState } from "@/lib/state/roundState.svelte";
    import { WORD_LENGTH } from "@/lib/constants";
    import MiniTile from "./widgets/parts/MiniTile.svelte";
    import { TileColor } from "$lib/types/Tile";

const RightPanelSection = {
    Instructions: "instructions",
    BlueHints: "blue-hints",
    Guesses: "guesses",
} as const;

const rightPanelSections = $derived([
    RightPanelSection.Instructions,
    ...(uiState().discoveredBlueTiles ? [RightPanelSection.BlueHints] : []),
    RightPanelSection.Guesses,
]);

const shownGuesses = $derived(
    uiState().gameOver
        ? roundState.pastWords.map((result, index) => ({result, index})).reverse()
        : [{result: roundState.pastWords.at(-1)!, index: roundState.pastWords.length - 1}]
);
const isShowingGameOverHistory = $derived(uiState().gameOver);

const translateOnlyFlip = (
    node: Element,
    {from, to}: {from: DOMRect, to: DOMRect},
    {
        duration=350,
        easing=cubicOut,
    }: {duration?: number, easing?: (time: number) => number}={},
) => {
    const dx = from.left - to.left;
    const dy = from.top - to.top;

    return {
        duration,
        easing,
        css: (_t: number, u: number) => `transform: translate(${u * dx}px, ${u * dy}px);`,
    };
};

const flyAbsoluteEarly = (
    node: HTMLElement,
	{
        disabled=false,
        delay=0,
        duration,
        easing,
        x=0,
        y=0,
    }: {disabled?: boolean, delay?: number, duration: number, easing: (t: number) => number, x?: number, y?: number},
) => {
    if (disabled) {
        return {
            delay: 0,
            duration: 0,
            css: () => "",
        };
    }

	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

    // const rect = node.getBoundingClientRect();

    node.style.position = "absolute";
    setTimeout(() => {
        node.style.position = "";
    }, delay);

	return {
		delay,
		duration,
		easing,
		css: (t: number, u: number) => `
transform: ${transform} translate(${u * x}px, ${u * y}px);
opacity: ${t};`
	};
};
</script>

<right-panel in:halfFlipLeft={{duration: 5000, easing: elasticOut, baseRot: "-35deg"}}>
    <right-panel-top>
        {#each rightPanelSections as section (section)}
            <right-panel-section
                class:guesses={section === RightPanelSection.Guesses}
                animate:translateOnlyFlip={{duration: 350, easing: cubicOut}}
            >
                {#if section === RightPanelSection.Instructions}
                    <Instructions />
                {:else if section === RightPanelSection.BlueHints}
                    <blue-hints>
                        <p in:halfFlipRight={{duration: 4000, easing: elasticOut}}>
                            Click a <MiniTile tileColor={TileColor.Blue} smaller /> to choose how it destroys tiles!
                        </p>

                        <p in:halfFlipRight={{duration: 4000, delay: 1000, easing: elasticOut}}>
                            Rows still on the board will give you hints for the new word.
                        </p>
                    </blue-hints>
                {:else}
                    <prev-guesses-grid-list>
                        {#each shownGuesses as {result, index} (result)}
                            {@const delay = (result.guesses.length + WORD_LENGTH - 1) * 100}
                            <prev-guesses-item
                                in:flyAbsoluteEarly={{
                                    disabled: isShowingGameOverHistory,
                                    duration: 250,
                                    x: 50,
                                    easing: cubicOut,
                                    delay: 750 + delay,
                                }}
                                out:fly={{
                                    duration: isShowingGameOverHistory ? 0 : 500,
                                    y: 50,
                                    easing: cubicIn,
                                    delay: isShowingGameOverHistory ? 0 : delay,
                                }}
                            >
                                <prev-guesses-label out:fade|global={{duration: 250, easing: cubicIn, delay: 125}}>guesses for word {index + 1}</prev-guesses-label>
                                <prev-guesses-grid-container>
                                    <PrevGuessesDisplay
                                        guessResults={result.guesses}
                                        showFinalWord={index === roundState.pastWords.length - 1}
                                        animated={!isShowingGameOverHistory}
                                        flashOnAlreadyGuessed={!isShowingGameOverHistory}
                                    />
                                </prev-guesses-grid-container>
                            </prev-guesses-item>
                        {/each}
                    </prev-guesses-grid-list>
                {/if}
            </right-panel-section>
        {/each}
    </right-panel-top>
</right-panel>




<style lang="scss">
@import "#/constants.scss";

* {
    transform-style: preserve-3d;
}

right-panel {
    grid-area: 3/3 / 6/4;
    place-self: stretch;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 5rem;

    transform: rotateY(-35deg) scale(var(--scale-fac));
    transform-origin: left;
    backface-visibility: hidden;


    --scale-fac: 1;
    @media screen and (max-width: $small-width) {
        --scale-fac: 0.75;
    }
}

right-panel-top {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    flex-grow: 1;
    min-height: 0;
}

right-panel-section {
    display: block;
}

right-panel-section.guesses {
    min-height: 0;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
}

blue-hints {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    p {
        margin: 0;
        backface-visibility: hidden;
    }
}

prev-guesses-grid-list {
    // display: flex;
    // flex-direction: column;
    // gap: 1rem;

    min-height: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
}

prev-guesses-item {
    display: flex;
    flex-direction: column;
}

prev-guesses-label {
    color: light-dark(#42444baf, #bec4d6af);
}

prev-guesses-grid-container {
    padding-left: 1rem;
}
</style>
