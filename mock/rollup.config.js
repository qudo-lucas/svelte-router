import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import babel from "rollup-plugin-babel";
import livereload from "rollup-plugin-livereload";
import json from "@rollup/plugin-json";
import copy from "rollup-plugin-copy";
import injectProcessEnv from "rollup-plugin-inject-process-env";
import scss from "rollup-plugin-scss";

const INPUT_DIR = "src";
const OUTPUT_DIR = "build";

const production = !process.env.ROLLUP_WATCH;

export default {
    input  : `${INPUT_DIR}/main.js`,
    output : {
        format : "iife",
        file   : `${OUTPUT_DIR}/bundle.js`,
        name   : "app",
    },
    plugins : [
        svelte(),
        resolve({
            browser : true,
            dedupe  : [ "svelte" ],
        }),
        babel({
            exclude        : "node_modules/**",
            runtimeHelpers : true,
        }),
        commonjs(),
        copy({
            targets : [
                { src : `${INPUT_DIR}/public/**`, dest : OUTPUT_DIR },
            ],
        }),
        scss({
            output : `${OUTPUT_DIR}/bundle.css`,
        }),
        json(),
        injectProcessEnv({
            NODE_ENV : production,
        }),
        !production && livereload(`${OUTPUT_DIR}`),
        !production && serve(),
    ],
};

function serve() {
    let started = false;

    return {
        writeBundle() {
            if(!started) {
                started = true;
                require("child_process").spawn("npm", [ "run", "serve", "--", "--dev" ], {
                    stdio : [ "ignore", "inherit", "inherit" ],
                    shell : true,
                });
            }
        },
    };
}
 
