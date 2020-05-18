<View
{router}
title="Usage"
next="events"
nextName="EVENTS"
back="home"
>   
<div>
<h6 class="mb-0"><strong>Getting Started</strong></h6>
<p>To get started, import Router and specify your views.</p>
<pre>
                    <code class="language-html">{
`
<div class="container">
    <Router initial="home" {views} />
</div>

<script>
import Router from "svelte-event-router";

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
                    <td>The initial route to load. This will also be the fallback URL for when a user tries to visit an invalid route on page load. After a page is loaded, invalid routes/events will fail silently.</td>
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
</View>

<script>
import View from "../components/view.svelte"
export let router;
</script>

<style>

</style>
