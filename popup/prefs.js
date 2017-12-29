// prefs.html -:- See LICENSE.txt for copyright and license details.

console.log("QQQ: **************** >> prefs.js");


var commandKeyInput, closeOnGoCheckbox, thWidthField, thHeightField;
var originalCommandKey;
var isMac;
var prefFields, prefSettings, origPrefSettings;
var okButton, restoreButton;
var prefs;

const CTRL_USER = "ctrl";
const ALT_USER = "alt";
const COMMAND_USER = "command";
const SHIFT_USER = "shift";

const CTRL_API = "Ctrl";
const ALT_API = "Alt";
const MAC_CTRL_API = "MacCtrl";
const SHIFT_API = "Shift";

const USER_NAMES_FROM_KEYS = {
    ",": ",",
    ".": ".",
    " ": "Space"
};

const API_NAMES_FROM_KEYS = {
    ",": "Comma",
    ".": "Period",
    " ": "Space"
};

const FUNCTION_KEY_NAMES = ["Home", "End", "PageUp", "PageDown", "Insert", "Delete",
                            "Up", "Down", "Left", "Right"];

const PREF_FIELD_NAMES = ["command_key", "closeOnGo", "th-width", "th-height"];

function initPrefs() {
    console.log("QQQ: >> initPrefs");
    FUNCTION_KEY_NAMES.forEach(function(name) {
	USER_NAMES_FROM_KEYS[name] = name.toLowerCase();
	API_NAMES_FROM_KEYS[name] = name;
    });

    prefFields = {};
    origPrefSettings = {};
    prefSettings = {};
    for (prefName of PREF_FIELD_NAMES) {
	prefFields[prefName] = document.getElementById(prefName);
	if (!prefFields[prefName]) {
	    throw new Error(`Awp: no field for pref ${prefName}`);
	}
    }
    okButton = document.getElementById("submit");
    restoreButton = document.getElementById("restore");
    okButton.addEventListener("click", submitChanges);
    restoreButton.addEventListener("click", restoreChanges);

    $("button").mouseover(doMouseOver);
    $("button").mouseout(doMouseOut);
    $("button").mousedown(doMouseDown);
    $("button").mouseup(doMouseUp);
    // $("#command_key").click(select);
    $("#command_key").keypress(handleConfigKeyPress);

    
    $("#closeOnReturn").change(doSetCloseOnGo);
    originalCommandKey = "";
    if (browser.commands.update) {
        console.log("QQQ: Should show the set-key\n");
        $("div#key_stuff").removeClass("hide").addClass("show");
    } else {
        console.log("QQQ: Should not show the set-key\n");
    }
 
    console.log("QQQ: ... initFields");
    initFields();
}

function dumpError(err, msg) {
    if (typeof(err) == "string") {
        msg += err;
    } else {
        msg += err.message;
    }
    console.log(msg);
}

function initFields() {
    commandKeyInput = document.getElementById("command_key");
    closeOnGoCheckbox = document.getElementById("closeOnGo");
    thWidthField = document.getElementById("th-width");
    thHeightField = document.getElementById("th-height");
    closeOnGoCheckbox.checked = true;
    
    var gotCommandsOK = function(commands) {
        if (commands[0].name == "_execute_browser_action") {
            commandKeyInput.value =
		prefSettings["_execute_browser_action"] =
		origPrefSettings["_execute_browser_action"] =
		userStringFromInternalString(commands[0].shortcut);
        }
	getPrefs();
    };
    var gotCommandsErr = function(err) {
        var msg = "Error getting add-on commmands: ";
        if (typeof(err) == "string") {
            msg += err;;
        } else {
            msg += err.message;
        }
        console.log(msg);
	getPrefs();
    };
    browser.commands.getAll().then(gotCommandsOK, gotCommandsErr);
}

function getPrefs() {
    let gotPrefsOK = function(prefs) {
	console.log(`QQQ: loaded prefs ${JSON.stringify(prefs)}`);
	if ('prefs' in prefs) {
	    let innerPrefs = prefs['prefs'];
	    for (var p in innerPrefs) {
		origPrefSettings[p] = innerPrefs[p];
	    }
	}
	initFieldsWithPrefs();
        getIsMac();
    };
    let gotPrefsErr = function(err) {
        dumpError(err, `Error getting prefs`);
	prefs = {};
	initFieldsWithPrefs();
        getIsMac();
    };
    console.log(`QQQ: -- browser.storage.local.get("prefs")`);
    browser.storage.local.get().then(gotPrefsOK, gotPrefsErr);
}

function getIsMac() {
    var gotPlatformInfoOK = function(info) {
        //console.log("QQQ: info.os: " + info.os);
        isMac = info.os == "mac";
    };
    var gotPlatformInfoError = function(err) {
        dumpError(err, "Error getting platform info: ");
    }
    browser.runtime.getPlatformInfo().then(gotPlatformInfoOK, gotPlatformInfoError);
}

function doMouseOver(eventData) {
    if (!eventData.currentTarget.disabled) {
        $(this).addClass("highlighted");
    }
}

function doMouseOut(eventData) {
    $(this).removeClass("highlighted");
    $(this).removeClass("pressed");
}

function doMouseDown(eventData) {
    if (!eventData.currentTarget.disabled) {
        $(this).addClass("pressed");
    }
}

function doMouseUp(eventData) {
    $(this).removeClass("pressed");
}

function verifyShortcutFromEvent(event) {
    let validKeys = isMac ? ["ctrlKey", "metaKey"] : ["ctrlKey", "altKey"];
    let modifiers = isMac ? [CTRL_USER, COMMAND_USER] : [CTRL_USER, ALT_USER];
    let count = validKeys.reduce(function(acc, name) {
        return acc + (event[name] ? 1 : 0) }, 0);
    if (count == 0 && FUNCTION_KEY_NAMES.indexOf(event.key) == -1) {
	console.log(`${event.key} must have exactly one of the ${modifiers.join(", ")} modifier keys`);
        throw new Error("bad modifiers");
    } else if (count > 1) {
	//XXX: What about the media keys?
        console.log("The startup keybinding must have exactly one of the <" + modifiers.join(", ") + "> modifier keys");
        throw new Error("bad modifiers");
    }
}

function eventToInternalProperties(event) {
    var props = {ctrlKey:false, macCtrlKey: false,
                 altKey: false, shiftKey: false, key:"" };
    ["key", "altKey", "shiftKey"].forEach(function(p) { props[p] = event[p]; });
    if (event.ctrlKey) {
        if (isMac) {
            props.macCtrlKey = true;
        } else {
            props.ctrlKey = true;
        }
    }
    if (event.metaKey && isMac) {
        props.ctrlKey = true;
    }
    var s = [];
    ["key", "altKey", "shiftKey", "macCtrlKey", "ctrlKey"].forEach(function(p) {
            s.push(p + ":" + (props[p] ? "true" : "false"));
        });
            
    return props;
}

function userStringFromInternalString(internalCommand) {
    let parts = internalCommand.split("+");
    let newParts = parts.map(function(internalCommandName) {
	switch (internalCommandName) {
	case ALT_API:
	    return ALT_USER;
	case SHIFT_API:
	    return SHIFT_USER;
	case CTRL_API:
	    return isMac ? COMMAND_USER : CTRL_USER;
	case MAC_CTRL_API:
	    return CTRL_USER;
	default:
	    if (USER_NAMES_FROM_KEYS[internalCommandName]) {
		return USER_NAMES_FROM_KEYS[internalCommandName];
	    } else {
		return internalCommandName;
	    }
	}
    });
    return newParts.join("+");
}

// "MacCtrl" is a very un-user-friendly way to refer to the "ctrl" key on osx,
// same with calling the Command key "ctrl".  So let's show the users
// user-centered views of the pref values.
    
function propertiesToUserAndAPIString(props) {
    let s_user = "", s_api = "";
    if (props.altKey) {
        s_user = ALT_USER + "+";
        s_api = ALT_API + "+";
    } else if (props.ctrlKey) {
	if (isMac) {
	    s_user = COMMAND_USER + "+";
	    s_api = CTRL_API + "+";
	} else {
	    s_user = CTRL_USER + "+";
	    s_api = CTRL_API + "+";
	}
    } else if (props.macCtrlKey) {
        s_user = CTRL_USER + "+";
        s_api = MAC_CTRL_API + "+";
    }
    if (props.shiftKey) {
        s_user += SHIFT_USER + "+";
        s_api += SHIFT_API + "+";
    }
    var propNames =  {
        ",": "Comma",
        ".": "Period",
        " ": "Space"
    };
        
    if (/^[A-Z]$/.test(props.key)) {
        s_user += props.key.toLowerCase();
        s_api += props.key.toUpperCase();
    } else if (/^[0-9a-z]$/.test(props.key)) {
        s_user += props.key;
        s_api += props.key.toUpperCase();
    } else if (/^F[0-9]+$/.test(props.key) || FUNCTION_KEY_NAMES.indexOf(props.key) >= 0) {
        s_user += props.key;
        s_api += props.key;
    } else if (props.key in USER_NAMES_FROM_KEYS) {
        s_user += USER_NAMES_FROM_KEYS[props.key];
        s_api += props.key;
    } else {
	s_user += "+" + props.key;
        console.log("Can't support a key sequence of '" + s_user + "'");
        throw new Error("bad key sequence: " + s_user);
    }
    return [s_user, s_api];
}

function initFieldsWithPrefs() {
    if ("_execute_browser_action" in origPrefSettings) {
	commandKeyInput.value = origPrefSettings["_execute_browser_action"];
    } else {
	commandKeyInput.value = "";
    }
    if ("closeOnGo" in origPrefSettings) {
	console.log(`QQQ: Loaded closeOnGo pref ${origPrefSettings["closeOnGo"]}`);
	closeOnGoCheckbox.checked = !!origPrefSettings["closeOnGo"];
    } else {
	console.log(`QQQ: Didn\'t load closeOnGo pref`);
	closeOnGoCheckbox.checked = true;
	origPrefSettings["closeOnGo"] = true;
    }
    /*
    if ("th-width" in origPrefSettings) {
	thWidthField.value = desiredWidth = origPrefSettings["th-width"];
    } else {
	thWidthField.value = origPrefSettings["th-width"] = "";
    }
    if ("th-height" in origPrefSettings) {
	thHeightField.value = origPrefSettings["th-height"];
    } else {
	thHeightField.value = origPrefSettings["th-height"] = 10;
    }
*/
}

function restoreChanges() {
    if ("_execute_browser_action" in origPrefSettings) {
	commandKeyInput.value = origPrefSettings["_execute_browser_action"];
    } else {
	commandKeyInput.value = "";
    }
    closeOnGoCheckbox.checked = origPrefSettings["closeOnGo"];
    thWidthField.value = origPrefSettings["th-width"]
    thHeightField.value = origPrefSettings["th-height"];
}

function submitChanges() {
    console.log(`QQQ: >> submitChanges`);
    var innerPrefs = {};
    var prefs = {"prefs": innerPrefs};
    innerPrefs["closeOnGo"] = closeOnGoCheckbox.checked;
    let updatePrefErr = function(err) {
        dumpError(err, `Error updating prefs`);
    };
    console.log(`QQQ - storage.local.set ${JSON.stringify(prefs)}`);
    browser.storage.local.set(prefs).catch(
	function(err) {
            dumpError(err, "Error updating _execute_browser_action: ");
	});
    
	
    console.log(`QQQ - test ${prefSettings["_execute_browser_action"]} vs ${origPrefSettings["_execute_browser_action"]}`);
    if (prefSettings["_execute_browser_action"] !== origPrefSettings["_execute_browser_action"]) {
        browser.commands.update([{ name: "_execute_browser_action",
				   shortcut: propertyStrings[1] }]).catch(updatePrefErr);
    }
}

function handleConfigKeyPress(event) {
    console.log(`QQQ: handleConfigKeyPress: ${event.key}`);
    var target = event.target;
    try {
	verifyShortcutFromEvent(event);
        let props = eventToInternalProperties(event);
	let propertyStrings = propertiesToUserAndAPIString(props);
        target.value = propertyStrings[0];
	// Save the value now, use it later if we need it
	prefSettings["_execute_browser_action"] = propertyStrings[1];
	//XXX: Invoke browser.commands.update in an update-command.
        //event.cancelDefault();
	
        browser.commands.update([{ name: "_execute_browser_action",
				   shortcut: propertyStrings[1] }]);
    } catch(ex) {
        console.log(`QQQ: Error: ${ex} \n ${ex}`);
    }
    event.stopPropagation();
    event.preventDefault();
}

function doSetCloseOnGo(event) {
    //console.log("QQQ: Doing doSetCloseOnGo(event), checked: " + this.checked);
}

$(document).ready(initPrefs);

try {
} catch(ex) {
    console.log("bad prefs.js -- " + ex);
}

