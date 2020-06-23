<svelte:component this={component} send={sendEvent} router={sharedData} {...props}/>
<script>
import { onMount, createEventDispatcher } from "svelte";
import { derived, writable } from "svelte/store";

const dispatch = createEventDispatcher();

export let base = "";
export let initial;
export let views = {};
export let props = {};

let _event;
let event;
let component;

const currentName = writable("");
const lastEvent = writable({});

// I feel like we shouldn't follow the docs and name the derived
// stores with a "$" since we are inside a .svelte file not .js...idk.
// Using a "_" instead just to be safe."
const sharedData =
    derived(
        [ currentName, lastEvent ],
        ([ _currentName, { name, data, _event } ], set) => set({
            data,
            _event, 
            event : name,
            current : _currentName,
            params  : mapParams() // Capture url params when anything happens
        }));


// Used to test if we are able to match
// the current url with a component
const urls = new Map(
    Object.entries(views).map(([name, component]) => {
        const url = `#/${base}${base ? "/" : ""}${name}`;
        return [url, name];
    })
);

// Remove leading and trailing slashes
const sanitize = (str) => {
    return str.replace(/^\/|\/$/g, '');
}

const read = () => {
    const start = `#/${base}${base ? "/" :""}`;
    // Ignore url params since sendEvent captures those. 
    const [ hash ] = window.location.hash.split("?");
    const [ name ] = hash.replace(start, "").split("/");

    // // Put it back together
    const newUrl = `#/${base}${base ? "/" :""}${name}`;

    if(urls.has(newUrl)) {
        initial = urls.get(newUrl);
    }

    sendEvent(initial);
}

const params = () => {
    const [, params = false ] = window.location.href.split("?");
    
    if(!params) {
        return params;
    }

    return params;
};

const mapParams = () => {
    if(!params()) {
        return new Map();
    }

    const segments = params().split("&");
    return new Map(segments.map((segment) => segment.split("=")));
};

const sendEvent = (name = "", data = {}) => {
    let _event = $lastEvent;
    let url = `#/${base}${base ? "/" : ""}${name}`;

    $lastEvent = {
        _event,
        data,
        name,
    };

    sanitize(name);
    
    // Test if we have a component for this url
    if(urls.has(url) && name !== $currentName) {
        // Render new component
        component = views[name];
        $currentName = name;
        console.log(`ROUTER: View updated to "${name}"`);

        // Add the url to the address bar.
        // Slap the event on the browser history real quick:
        // We do this so that in theory, you could hit the 
        // browser back button and the page would load with 
        // whatever state it had the last time it got an event.
        history.pushState($lastEvent, name, `${url}${params() ? `?${params()}` : ""}`);
    } else { 
        console.log(`ROUTER: No view found for event ${name}. Available views:`, Object.keys(views));
    }
}

window.onpopstate = () => read();

onMount(() => read());

export const send = sendEvent;
export const router = sharedData;
</script>
