<main>
    {#each Object.keys(views) as view}
        <button on:click="{() => send(view)}">{view}</button>
    {/each}
    <Router
        {views}
        initial="page-one"
        bind:send={send}
        bind:router={router}
    />
</main>

<script>
import Router from "../../dist";

import pageOne from "./views/page-one.svelte";
import pageTwo from "./views/page-two.svelte";

const views = {
    "page-one" : pageOne,
    "page-two" : pageTwo,
};

let send;
let router;

$: ({ event, params } = $router || {});

$: if($router) {
    event === "page-two" && console.log("I am at page two");
    params.has("id") && console.log(params.get("id"))
}

</script>