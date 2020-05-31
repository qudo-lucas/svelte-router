<View
{router}
title="Nested Routers"
back="events"
next="home"
nextName="HOME"
>   
<div>
    <div class="">
    <p>Sometimes you need routers inside routers inside routers inside routers. SER makes it easy and keep track of your router instances. Add a nested router by adding a router to one of your existing views. The only difference between setting up a nested router and top level router is that you <strong>need to supply a base</strong>.</p>
        <div>
            <pre>
                    <code class="language-html">{
`
<div class="container">
    <Router
        {base}
        initial="signin"
        views={{
            signin,
            signup
        }} 
    />
</div>

<script>
import Router from "svelte-event-router";

// Views
import signin from "./views/signin.svelte";
import signup from "./views/signup.svelte";

// This tells the router to live at: url.com/#/users/auth/[here]
const base = "users/auth";
</script>
`
                    }</code>
                </pre>
        </div>
    </div>
</div>
</View>

<script>
import View from "../components/view.svelte"
export let router;
</script>

<style>

</style>