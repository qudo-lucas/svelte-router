<div class="view" bind:this={view}>
    <div class="mdl-card mdl-shadow--2dp">
        <div class="mdl-card__title mdl-card--expand">
            <img src="logo.svg" alt="logo"/>
        </div>
        <div class="mdl-card__supporting-text">
            <p class="m-0">A simple router that enforces event driven user interfaces.</p>
            <div class="py-4">
                <pre><code class="language-js">{`npm install svelte-event-router`}</code></pre>
            </div>
        </div>
        <div class="mdl-card__actions mdl-card--border">
            <button on:click={() => router.send("usage")} class="
                mdl-button
                mdl-js-button
                mdl-button--raised
                mdl-button--colored
                bg-orange">
            Get Started
            </button>
        </div>
    </div>
</div>
<script>
import { onMount } from "svelte";

export let router;
let view;

onMount(() => {
    var script= document.createElement('script');
    script.src= 'prism.js';
    view.appendChild(script);
});

</script>