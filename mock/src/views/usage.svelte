<div class="view" bind:this={view}>
    <div class="demo-card-square mdl-card mdl-shadow--2dp">
        <div class="mdl-card__supporting-text">
            <div class="py-4">
                <h3>Usage</h3>
                <hr>
                <pre>
                    <code class="language-html">{
`
<div class="container">
    <Router initial="home" {views} />
</div>

<script>
import Router from "svelte-router";

// Views
import home from "./views/home.svelte";
import usage from "./views/usage.svelte";
import events from "./views/events.svelte";
import nested from "./views/nested.svelte";

const views = {
    home,                   // url.com/#/home                      
    usage,                  // url.com/#/usage                        
    events,                 // url.com/#/events                 
    renamed : nested,       // url.com/#/renamed
}
</script>
`
                    }</code>
                </pre>
            </div>
            <div class="py-4">
               
            </div>
            <table>
                <thead>
                    <tr>
                        <th>option</th>
                        <th>type</th>
                        <th>description</th>
                    </tr>
                </thead>
                <tbody>
                <tr>
                    <td>
                        <div class="option">
                            <pre class="m-0">initial</pre>
                        </div>
                    </td>
                    <td>
                        <strong>String (required)</strong>
                    </td>
                    <td>The initial route to load. This will also be the fallback URL for when a user tries to visit an invalid route on page load. After a page it loaded, invalid routes will fail silently.</td>
                </tr>
                <tr>
                    <td>
                        <div class="option">
                            <pre class="m-0">views</pre>
                        </div>
                    </td>
                    <td>
                        <strong>Object (required)</strong>
                    </td>
                    <td>An object full of components. The keys will become routes and the values are the components to be loaded.</td>
                </tr>
                <tr>
                    <td>
                        <div class="option">
                            <pre class="m-0">base</pre>
                        </div>
                    </td>
                    <td>
                        <strong>String (optional)</strong>
                    </td>
                    <td>Primarily used in nested routers. This is the part of the URL that comes before your route name.<br><strong>Example:</strong> In <i>url.com/auth/signup</i>, <i>auth</i> would be the <strong>base</strong> and <i>signup</i> would be the route/view name.</td>
                </tr>
                </tbody>
            </table>

        </div>
        <div class="mdl-card__actions mdl-card--border d-flex justify-content-between">
            <button on:click={() => router.send("home")} class="
                mdl-button
                mdl-js-button
                mdl-button--raised">
            Back
            </button>
            <button on:click={() => router.send("events")} class="
                mdl-button
                mdl-js-button
                mdl-button--raised
                mdl-button--colored
                bg-orange">
            Events
            </button>
        </div>
    </div>
</div>
<script>
export let router;
import { onMount } from "svelte";

let view;

onMount(() => {
    var script= document.createElement('script');
    script.src= 'prism.js';
    view.appendChild(script);
});

</script>

