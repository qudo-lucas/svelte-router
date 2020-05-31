<View
{router}
next="usage"
nextName="GET STARTED"
centered={true}
title="Hello"
>   
<div class="wrapper t-center py-6">
   <div class="">
        <img src="logo.svg" alt="logo"/>
    </div>
    <div class="">
        <h2 class="mt-2 mb-5">A simple SPA router that enforces event driven user interfaces.</h2>
        <div>
            <pre><code class="language-js">{`npm install svelte-event-router`}</code></pre>
        </div>
    </div>
</div>
</View>

<script>
import View from "../components/view.svelte"
export let router;
</script>

<style>
    .wrapper {
        margin: 0 auto;
        max-width: 500px;
    }
</style>