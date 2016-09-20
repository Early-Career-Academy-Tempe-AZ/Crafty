var Crafty = require('../core/core.js');


function InputButtonGroup(keys) {
    this.keys = keys;
}

InputButtonGroup.prototype = {
    isActive: function () {
        for (var k in this.keys) {
            if (Crafty.keydown[this.keys[k]]){
                 return true;
            }
        }
        return false;
    }
};

// Allow the creation of custom inputs
Crafty.s("Controls", {
    init: function () {
        // internal object to store definitions
        this._dpads = {};
    },

    events: {
        "EnterFrameInput" : function() {
            this.runEvents();
        }
    },

    runEvents: function () {
        for (var d in this._dpads) {
            var dpad = this._dpads[d];
            dpad.oldX = dpad.x;
            dpad.oldY = dpad.y;
            this.updateInput(dpad, dpad.allowMultipleDirections);
            this.updateActiveDirection(dpad, dpad.normalize);
            dpad.event.x = dpad.x;
            dpad.event.y = dpad.y;
            if (dpad.x !== dpad.oldX || dpad.y !== dpad.oldY) {
                Crafty.trigger("DirectionalInput", dpad.event);
            }
        }
    },

    getDpad: function(name) {
        return this._dpads[name];
    },

    defineDpad: function (name, definition, options) {
        // Store the name/definition pair
        if (this._dpads[name]) delete this._dpads[name];

        var directionDict = {};
        for (var k in definition) {
            var direction = definition[k];
            var keyCode = Crafty.keys[k] || k;

            // create a mapping of directions to all associated keycodes
            if (!directionDict[direction]) {
                directionDict[direction] = [];
            }
            directionDict[direction].push(keyCode);
            
        }

        // Create a useful definition from the input format that tracks state
        var parsedDefinition = {};
        for (var d in directionDict) {
            parsedDefinition[d] = {
                input: new InputButtonGroup(directionDict[d]),
                active: false,
                n: this.parseDirection(d)
            };
        }
        if (typeof options === 'undefined') {
            options = {};
        }
        if (typeof options.normalize === 'undefined'){
            options.normalize = false;
        }
        if (typeof options.allowMultipleDirections === 'undefined') {
            options.allowMultipleDirections = true;
        }
        // Create the fully realized dpad object
        this._dpads[name] = {
            name: name,
            directions: parsedDefinition,
            x: 0,
            y: 0,
            oldX: 0,
            oldY: 0,
            event: { x: 0, y: 0, name: name },
            normalize: options.normalize,
            allowMultipleDirections: options.allowMultipleDirections
        };
    },

    // Takes an amount in degrees and converts it to an x/y object.
    // Clamps to avoid rounding issues with sin/cos
    parseDirection: function (direction) {
        return {
            x: Math.round(Math.cos(direction * (Math.PI / 180)) * 1000) / 1000,
            y: Math.round(Math.sin(direction * (Math.PI / 180)) * 1000) / 1000
        };
    },

    // dpad definition is a map of directions to keys array and active flag
    updateActiveDirection: function (dpad, normalize) {
        dpad.x = 0;
        dpad.y = 0;
        for (var d in dpad.directions) {
            var dir = dpad.directions[d];
            if (!dir.active) continue;
            dpad.x += dir.n.x;
            dpad.y += dir.n.y;
        }

        // Normalize
        if (normalize) {
            var m = Math.sqrt(dpad.x * dpad.x + dpad.y * dpad.y);
            if (m > 0) {
                dpad.x = dpad.x / m;
                dpad.y = dpad.y / m;
            }
        }
    },

    updateInput: function (dpad, multi) {
        var d, dir;
        for (d in dpad.directions) {
            dir = dpad.directions[d];
            // If any of the directions are already active, and the key is held down, stick with that one
            if (!multi && dir.active) {
                if (dir.input.isActive()) return;
            }
            dir.active = false;
        }

        for (d in dpad.directions) {
            dir = dpad.directions[d];
            if (dir.input.isActive()) {
                dir.active = true;
                if (!multi) return;
            }
        }
    }

});