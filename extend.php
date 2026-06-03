<?php

use Flarum\Extend;
use Ernestdefoe\ThemeToggle\Content\PrePaintScheme;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less')
        // Server-side pre-paint: set <html data-theme> from the visitor's own
        // stored choice before first paint, so a full load (e.g. homepage →
        // forum) never flashes the wrong scheme while the JS bundle boots.
        ->content(PrePaintScheme::class),

    new Extend\Locales(__DIR__.'/locale'),
];
