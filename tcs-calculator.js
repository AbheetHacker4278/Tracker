/**
 * GATE 2027 CSE - Official TCS iON Scientific Calculator
 * Complete mathematical engine with Float Mode & Dynamic Resizing
 */

(function () {
  "use strict";

  // =========================================================================
  // CONSTANTS & STATE VARIABLES
  // =========================================================================
  const strNaN = "NaN";
  const strInf = "Infinity";
  const strMathError = "Math Error";
  const strEmpty = "0";
  const maxLength = 30;

  let opCodeArray = [];
  let stackArray = [];
  let openArray = [];
  let trigDisplay = "";
  let stackVal1 = 1;
  let stackVal2 = 0;
  let opCode = 0;
  let newOpCode = 0;
  let stackVal = 0;
  let memVal = 0;
  let memory = 0;
  let boolClear = true;
  let modeSelected = "deg";
  let displayString = "";
  let trig = 0;

  // Window State
  let calcScale = 1.0;
  let isFloating = true;
  let isGhost = 0; // 0: 100%, 1: 85%, 2: 65%
  let isDarkMode = false;
  let isPracticeKeys = false;
  let isMinimized = false;
  let isVisible = false;
  let currentPosX = null;
  let currentPosY = null;
  let isInitialized = false;

  // =========================================================================
  // IMMEDIATE WINDOW METHOD REGISTRATION (Guarantees onclick handlers never fail)
  // =========================================================================
  window.toggleGateCalculator = function () {
    ensureInit();
    toggleGateCalculator();
  };
  window.openGateCalculator = function () {
    ensureInit();
    openGateCalculator();
  };
  window.closeGateCalculator = function () {
    ensureInit();
    closeGateCalculator();
  };
  window.minimizeGateCalculator = function () {
    ensureInit();
    minimizeGateCalculator();
  };
  window.restoreGateCalculator = function () {
    ensureInit();
    restoreGateCalculator();
  };
  window.setGateCalculatorScale = function (s) {
    ensureInit();
    applyScale(s);
  };
  window.toggleGateCalculatorFloat = function () {
    ensureInit();
    toggleFloatMode();
  };
  window.toggleGateCalculatorPip = function () {
    ensureInit();
    toggleGateCalculatorPip();
  };
  window.openGateCalculatorPip = function () {
    ensureInit();
    openGateCalculatorPip();
  };
  window.closeGateCalculatorPip = function () {
    ensureInit();
    closeGateCalculatorPip();
  };

  // =========================================================================
  // MATHEMATICAL FUNCTIONS
  // =========================================================================
  function gamma(n) {
    const g = 7;
    const p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (n < 0.5) {
      return Math.PI / Math.sin(n * Math.PI) / gamma(1 - n);
    } else {
      n--;
      let x = p[0];
      for (let i = 1; i < g + 2; i++) {
        x += p[i] / (n + i);
      }
      const t = n + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
    }
  }

  function factorial(n) {
    if (n > 170) return strInf;
    if (n === 1 || n === 0) return 1;
    if (n < 0) return strMathError;
    if (n % 1 !== 0) return gamma(n + 1);
    return n * factorial(n - 1);
  }

  function nthroot(x, n) {
    try {
      const negate = n % 2 === 1 && x < 0;
      if (negate) x = -x;
      const possible = Math.pow(x, 1 / n);
      return negate ? -possible : possible;
    } catch (e) {
      return strMathError;
    }
  }

  function changeXBasedOnMode(mode, inputValue) {
    return mode === "deg" ? inputValue * (Math.PI / 180) : inputValue;
  }

  function tanCalc(mode, inputVal) {
    if (mode === "deg") {
      if (Math.abs((inputVal - 90) % 180) === 0 || Math.abs((inputVal + 90) % 180) === 0) return strMathError;
      if (inputVal % 180 === 0) return "0";
      return Math.tan(inputVal * (Math.PI / 180));
    } else {
      const kCos = (inputVal - Math.PI / 2) / Math.PI;
      if (Math.abs(kCos - Math.round(kCos)) < 1e-12) return strMathError;
      const kSin = inputVal / Math.PI;
      if (Math.abs(kSin - Math.round(kSin)) < 1e-12) return "0";
      return Math.tan(inputVal);
    }
  }

  function cosCalc(mode, inputVal) {
    if (mode === "deg") {
      if (Math.abs((inputVal - 90) % 180) === 0 || Math.abs((inputVal + 90) % 180) === 0) return "0";
      return Math.cos(inputVal * (Math.PI / 180));
    } else {
      const k = (inputVal - Math.PI / 2) / Math.PI;
      if (Math.abs(k - Math.round(k)) < 1e-12) return "0";
      return Math.cos(inputVal);
    }
  }

  function sinCalc(mode, inputVal) {
    if (mode === "deg") {
      if (inputVal % 180 === 0) return "0";
      return Math.sin(inputVal * (Math.PI / 180));
    } else {
      const k = inputVal / Math.PI;
      if (Math.abs(k - Math.round(k)) < 1e-12) return "0";
      return Math.sin(inputVal);
    }
  }

  function cotCalc(mode, inputVal) {
    const tanVal = tanCalc(mode, inputVal);
    if (tanVal === "0" || tanVal === 0) return strMathError;
    if (tanVal === strMathError) return "0";
    return 1 / tanVal;
  }

  function secCalc(mode, inputVal) {
    const cosVal = cosCalc(mode, inputVal);
    if (Number(cosVal).toFixed(8) === "0") return strMathError;
    return 1 / cosVal;
  }

  function cosecCalc(mode, inputVal) {
    const sinVal = sinCalc(mode, inputVal);
    if (Number(sinVal).toFixed(8) === "0") return strMathError;
    return 1 / sinVal;
  }

  function changeValOfInvBasedOnMode(mode, ipVal) {
    return mode === "deg" ? (180 / Math.PI) * ipVal : ipVal;
  }

  function sinInvCalc(mode, inputVal) {
    const ipVal = Math.asin(inputVal);
    if (isNaN(ipVal)) return strMathError;
    return changeValOfInvBasedOnMode(mode, ipVal);
  }

  function cosInvCalc(mode, inputVal) {
    const ipVal = Math.acos(inputVal);
    if (isNaN(ipVal)) return strMathError;
    return changeValOfInvBasedOnMode(mode, ipVal);
  }

  function tanInvCalc(mode, inputVal) {
    const ipVal = Math.atan(inputVal);
    if (isNaN(ipVal)) return strMathError;
    return changeValOfInvBasedOnMode(mode, ipVal);
  }

  function inverseSineH(inputVal) {
    return Math.log(inputVal + Math.sqrt(inputVal * inputVal + 1));
  }

  function formatTcsResult(retVal) {
    let num = typeof retVal === "string" ? parseFloat(retVal) : retVal;
    if (isNaN(num)) return retVal;
    if (!isFinite(num)) return num > 0 ? strInf : "-Infinity";

    if (Math.abs(num) < 0.00000001 || Math.abs(num) > 100000000) {
      return String(num);
    }
    if (num.toFixed(8) % 1 !== 0) {
      let i = 1;
      while (i < 10) {
        if (num.toFixed(i) != 0 && num.toFixed(i) / num.toFixed(i + 8) === 1) {
          num = num.toFixed(i);
          break;
        }
        i++;
      }
    } else {
      num = num.toFixed(0);
    }
    if (num === "-0" || num === -0) num = "0";
    return String(num);
  }

  // =========================================================================
  // CORE CALCULATOR UI HELPERS & DISPATCHERS
  // =========================================================================
  function getElements() {
    return {
      widget: document.getElementById("gateCalculatorWidget"),
      inBox: document.getElementById("keyPad_UserInput"),
      inBox1: document.getElementById("keyPad_UserInput1"),
      memoryFlag: document.getElementById("memory"),
      pill: document.getElementById("gateCalcMinimizedPill"),
      pillVal: document.getElementById("gateCalcPillDisplay"),
      backdrop: document.getElementById("gateCalcModalBackdrop"),
      scaleWrapper: document.getElementById("gateCalcScaleWrapper"),
      scaleLabel: document.getElementById("gateCalcScaleLabel"),
      scaleMenu: document.getElementById("gateCalcScaleMenu"),
      modeBadge: document.getElementById("gateCalcModeBadge"),
      copyBtn: document.getElementById("gateCalcCopyBtn"),
      helpContent: document.getElementById("helpContent"),
      helpBtn: document.getElementById("keyPad_Help"),
      helpBackBtn: document.getElementById("keyPad_Helpback"),
      mainArea: document.getElementById("mainContentArea"),
      headerBtn: document.getElementById("gateCalcHeaderBtn"),
      pipBtn: document.getElementById("gateCalcPipBtn")
    };
  }

  function syncPillDisplay() {
    const { inBox, pillVal } = getElements();
    if (inBox && pillVal) {
      pillVal.innerText = inBox.value || "0";
    }
  }

  function displayCheck() {
    const { inBox1 } = getElements();
    if (!inBox1) return;
    switch (stackVal1) {
      case 2:
        inBox1.value = "";
        break;
      case 3:
        inBox1.value = inBox1.value.substring(
          0,
          inBox1.value.length - trigDisplay.length
        );
        stackVal2 = 4;
        break;
      case 5: {
        let string = "";
        for (let i = openArray.length; i >= 0; i--) {
          string = string + displayString.substring(0, displayString.indexOf("(") + 1);
          displayString = displayString.replace(string, "");
        }
        displayString = string.substring(0, string.lastIndexOf("("));
        inBox1.value = displayString;
        stackVal2 = 6;
        break;
      }
      default:
        break;
    }
  }

  function opcodeChange() {
    if (opCode !== 10 && opCode !== 0) {
      opCodeArray.push(opCode);
      stackArray.push(stackVal);
    }
    if (opCode === 0) {
      stackArray.push(stackVal);
    }
    opCode = 0;
  }

  function stackCheck(text) {
    const { inBox, inBox1 } = getElements();
    if (stackVal1 === 2) {
      inBox1.value = "";
    }
    if (stackVal1 === 0) {
      opCode = 0;
      let x = 1;
      switch (newOpCode) {
        case 5: x = 3; break;
        case 7: x = 5; break;
        case 8: x = 9; break;
        default: break;
      }
      if (inBox1.value.indexOf("e+") === -1) {
        inBox1.value = inBox1.value.substring(0, inBox1.value.length - x);
      }
      stackVal2 = 2;
    }
    if (stackVal1 === 5 || stackVal2 === 2) {
      stackVal2 = 0;
      displayString = inBox1.value + text;
    } else {
      if (inBox1.value.indexOf("e+0") > -1 && inBox.value.indexOf("-") > -1) {
        inBox1.value = inBox1.value.replace("e+0", "e");
      } else if (inBox1.value.indexOf("e+0") > -1) {
        inBox1.value = inBox1.value.replace("e+0", "e+");
      }
      displayString = inBox1.value + inBox.value + text;
    }
  }

  function oscBinaryOperation() {
    const { inBox } = getElements();
    const x2 = parseFloat(inBox.value);
    let retVal = 0;

    switch (opCode) {
      case 9:
        stackVal = parseFloat(stackVal) * Math.pow(10, x2);
        break;
      case 1:
        stackVal += x2;
        break;
      case 2:
        stackVal -= x2;
        break;
      case 3:
        stackVal *= x2;
        break;
      case 4:
        stackVal /= x2;
        break;
      case 6: {
        const precisioncheck = stackVal;
        stackVal = Math.pow(stackVal, x2);
        if (
          precisioncheck === 10 &&
          stackVal % 10 !== 0 &&
          (Math.abs(stackVal) < 0.00000001 || Math.abs(stackVal) > 100000000) &&
          x2 % 1 === 0
        ) {
          stackVal = stackVal.toPrecision(7);
        }
        break;
      }
      case 5:
        stackVal = stackVal % x2;
        break;
      case 7:
        stackVal = nthroot(stackVal, x2);
        break;
      case 8:
        stackVal = Math.log(stackVal) / Math.log(x2);
        break;
      case 11:
        stackVal = (stackVal / 100) * x2;
        break;
      case 0:
        stackVal = x2;
        break;
      default:
        break;
    }

    retVal = formatTcsResult(stackVal);
    inBox.value = retVal;
    boolClear = true;
    trig = 0;
    syncPillDisplay();
  }

  function operation() {
    while (opCodeArray.length > 0 && opCode) {
      if (opCode === 10) {
        opCode = opCodeArray[opCodeArray.length - 1];
        stackVal = stackArray[stackArray.length - 1];
        if (newOpCode === 1 || newOpCode === 2 || newOpCode <= opCode) {
          opCodeArray.pop();
          stackArray.pop();
        } else {
          opCode = 0;
          break;
        }
      } else if (stackArray[stackArray.length - 1] === "{") {
        break;
      } else {
        oscBinaryOperation();
        stackVal = stackArray[stackArray.length - 1];
        if (stackVal === "{") {
          opCode = 0;
          break;
        }
        opCode = opCodeArray[opCodeArray.length - 1];
        if (newOpCode === 1 || newOpCode === 2 || newOpCode <= opCode) {
          opCodeArray.pop();
          stackArray.pop();
        } else {
          opCode = 0;
          break;
        }
        if (!opCodeArray.length && stackArray.length > 0 && stackArray[stackArray.length - 1] !== "{") {
          stackVal = stackArray[stackArray.length - 1];
        }
      }
    }
  }

  function displayTrignometric(text, x) {
    if (stackVal2 === 1) {
      let string = "";
      for (let i = openArray.length; i >= 0; i--) {
        string = string + displayString.substring(0, displayString.lastIndexOf("(") + 1);
        displayString = displayString.replace(string, "");
      }
      displayString = string.substring(0, string.lastIndexOf("("));
      trigDisplay = text + "(" + x + ")";
    }
    if (stackVal2 === 2 || stackVal1 === 3) {
      if (stackVal2 === 3) {
        trigDisplay = text + "(" + x + ")";
        stackVal2 = 2;
      } else {
        displayString = displayString.replace(trigDisplay, "");
        trigDisplay = text + "(" + trigDisplay + ")";
      }
    } else {
      if (stackVal2 === 4) {
        displayString = "";
      }
      trigDisplay = text + "(" + x + ")";
    }
    displayString = displayString + trigDisplay;
  }

  function modeText(text, x) {
    const mode = modeSelected === "deg" ? "d" : "r";
    displayTrignometric(text + mode, x);
  }

  // =========================================================================
  // BUTTON ACTION HANDLERS
  // =========================================================================
  function handleNumeric(btnVal) {
    const { inBox, inBox1 } = getElements();
    if (!inBox) return;
    if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;

    if (boolClear) {
      inBox.value = strEmpty;
      boolClear = false;
    }
    let str = inBox.value;
    if (str.length > maxLength) return;

    if (btnVal === "." && str.indexOf(".") >= 0 && inBox1.value !== "") {
      inBox.value = strEmpty + ".";
      inBox1.value = "";
      syncPillDisplay();
      return;
    } else if (btnVal === "." && str.indexOf(".") >= 0) {
      return;
    }

    displayCheck();
    if (str !== strEmpty || str.length > 1 || btnVal === ".") {
      inBox.value = str + btnVal;
      stackVal1 = 1;
    } else {
      inBox.value = btnVal;
      stackVal1 = 1;
    }
    syncPillDisplay();
  }

  function handleConst(id) {
    const { inBox } = getElements();
    if (!inBox) return;
    if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;

    let retVal = strEmpty;
    switch (id) {
      case "keyPad_btnPi":
        retVal = Math.PI;
        break;
      case "keyPad_btnE":
        retVal = Math.E;
        break;
      default:
        break;
    }
    displayCheck();
    stackVal1 = 1;
    boolClear = true;
    inBox.value = retVal;
    syncPillDisplay();
  }

  function handleBinary(id, text) {
    const { inBox, inBox1 } = getElements();
    if (!inBox) return;
    if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;

    switch (id) {
      case "keyPad_btnPlus":
        stackCheck(text || "+");
        newOpCode = 1;
        if (opCode === 10 && stackArray.length > 0 && stackArray[stackArray.length - 1] === "{") {
          opcodeChange();
        }
        operation();
        stackVal1 = 0;
        break;
      case "keyPad_btnMinus":
        stackCheck(text || "-");
        newOpCode = 2;
        if (opCode === 10 && stackArray.length > 0 && stackArray[stackArray.length - 1] === "{") {
          opcodeChange();
        }
        operation();
        stackVal1 = 0;
        break;
      case "keyPad_btnMult":
        stackCheck(text || "*");
        newOpCode = 3;
        if (opCode === 1 || opCode === 2) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 3 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnDiv":
        stackCheck(text || "/");
        newOpCode = 4;
        if (opCode < 4 && opCode) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 4 || stackVal1 === 5 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_%":
        stackCheck("%");
        newOpCode = 11;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 6 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_EXP":
        stackCheck("e+0");
        newOpCode = 9;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 6 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 1;
        stackVal2 = 7;
        break;
      case "keyPad_btnYpowX":
        stackCheck("^");
        newOpCode = 6;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 6 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnMod":
        stackCheck("mod");
        newOpCode = 5;
        if (opCode === 1 || opCode === 2) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] === 1 || 2 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnYrootX":
        stackCheck("yroot");
        newOpCode = 7;
        if (opCode < 6 && opCode) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 6 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnYlogX":
        stackCheck("logxBasey");
        newOpCode = 8;
        if (opCode === 1 || opCode === 2) {
          opcodeChange();
        }
        if (opCode === 10) {
          if (opCodeArray[opCodeArray.length - 1] < 3 || (stackArray.length > 0 && stackArray[stackArray.length - 1] === "{")) {
            opcodeChange();
          } else {
            operation();
          }
        }
        stackVal1 = 0;
        break;
      case "keyPad_btnOpen":
        displayString = inBox1.value + "(";
        newOpCode = 0;
        inBox.value = 0;
        if (opCode !== 0) {
          opcodeChange();
        }
        openArray.push("{");
        stackArray.push("{");
        stackVal1 = 1;
        break;
      case "keyPad_btnClose":
        if (stackVal2 === 6) {
          stackVal = parseFloat(inBox.value);
          displayString = inBox1.value + inBox.value + ")";
        } else if (newOpCode !== 10) {
          if (stackVal1 !== 3) {
            if (inBox1.value.indexOf("e+0") > -1 && inBox.value.indexOf("-") > -1) {
              inBox1.value = inBox1.value.replace("e+0", "e");
            } else if (inBox1.value.indexOf("e+0") > -1) {
              inBox1.value = inBox1.value.replace("e+0", "e+");
            }
            displayString = inBox1.value + inBox.value + ")";
          } else {
            displayString = inBox1.value + ")";
          }
        } else {
          displayString = inBox1.value + ")";
        }

        if (openArray[0]) {
          openArray.pop();
          newOpCode = 10;
          while (opCodeArray[0] || openArray[0]) {
            if (stackArray[stackArray.length - 1] === "{") {
              stackArray.pop();
              break;
            } else {
              oscBinaryOperation();
              stackVal = stackArray[stackArray.length - 1];
              if (stackVal === "{") {
                stackArray.pop();
                opCode = 0;
                break;
              }
              stackArray.pop();
              opCode = opCodeArray[opCodeArray.length - 1];
              opCodeArray.pop();
              if (!opCodeArray[0] && stackArray.length > 0 && stackArray[stackArray.length - 1] !== "{") {
                stackVal = stackArray[stackArray.length - 1];
              }
            }
          }
        } else {
          return;
        }
        stackVal2 = 1;
        stackVal1 = 5;
        break;
      default:
        break;
    }

    if (opCode) {
      oscBinaryOperation();
    } else {
      stackVal = parseFloat(inBox.value);
      boolClear = true;
    }
    opCode = newOpCode;
    inBox1.value = displayString;
    syncPillDisplay();
  }

  function handleUnary(id, text) {
    const { inBox, inBox1 } = getElements();
    if (!inBox) return;
    if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;

    const x = parseFloat(inBox.value);
    let retVal = strMathError;

    switch (id) {
      case "keyPad_btnInverseSign":
        retVal = -x;
        trig = 1;
        stackVal2 = 3;
        break;
      case "keyPad_btnInverse":
        retVal = 1 / x;
        displayTrignometric("reciproc", x);
        break;
      case "keyPad_btnSquare":
        retVal = x * x;
        displayTrignometric("sqr", x);
        break;
      case "keyPad_btnSquareRoot":
        retVal = Math.sqrt(x);
        displayTrignometric("sqrt", x);
        break;
      case "keyPad_btnCube":
        retVal = x * x * x;
        displayTrignometric("cube", x);
        break;
      case "keyPad_btnCubeRoot":
        retVal = nthroot(x, 3);
        displayTrignometric("cuberoot", x);
        break;
      case "keyPad_btnLn":
        retVal = Math.log(x);
        displayTrignometric("ln", x);
        break;
      case "keyPad_btnLg":
        retVal = Math.log(x) / Math.LN10;
        displayTrignometric("log", x);
        break;
      case "keyPad_btnExp":
        retVal = Math.exp(x);
        displayTrignometric("powe", x);
        break;
      case "keyPad_btnSin":
        retVal = sinCalc(modeSelected, x);
        modeText("sin", x);
        trig = 1;
        break;
      case "keyPad_btnCosin":
        retVal = cosCalc(modeSelected, x);
        modeText("cos", x);
        trig = 1;
        break;
      case "keyPad_btnTg":
        retVal = tanCalc(modeSelected, x);
        modeText("tan", x);
        trig = 1;
        break;
      case "keyPad_btnFact":
        retVal = factorial(x);
        displayTrignometric("fact", x);
        break;
      case "keyPad_btn10X":
        retVal = Math.pow(10, x);
        if (retVal % 10 !== 0 && (Math.abs(retVal) < 0.00000001 || Math.abs(retVal) > 100000000) && x % 1 === 0) {
          retVal = retVal.toPrecision(7);
        }
        displayTrignometric("powten", x);
        break;
      case "keyPad_btnAsinH":
        retVal = inverseSineH(x);
        modeText("asinh", x);
        break;
      case "keyPad_btnAcosH":
        retVal = Math.log(x + Math.sqrt(x + 1) * Math.sqrt(x - 1));
        modeText("acosh", x);
        break;
      case "keyPad_btnAtanH":
        retVal = 0.5 * (Math.log(1 + x) - Math.log(1 - x));
        modeText("atanh", x);
        break;
      case "keyPad_btnAbs":
        retVal = Math.abs(x);
        displayTrignometric("abs", x);
        break;
      case "keyPad_btnLogBase2":
        retVal = Math.log(x) / Math.log(2);
        displayTrignometric("logXbase2", x);
        break;
      case "keyPad_btnAsin":
        retVal = sinInvCalc(modeSelected, x);
        modeText("asin", x);
        trig = 1;
        break;
      case "keyPad_btnAcos":
        retVal = cosInvCalc(modeSelected, x);
        modeText("acos", x);
        trig = 1;
        break;
      case "keyPad_btnAtan":
        retVal = tanInvCalc(modeSelected, x);
        modeText("atan", x);
        trig = 1;
        break;
      case "keyPad_btnSinH":
        retVal = (Math.pow(Math.E, x) - Math.pow(Math.E, -x)) / 2;
        modeText("sinh", x);
        break;
      case "keyPad_btnCosinH":
        retVal = (Math.pow(Math.E, x) + Math.pow(Math.E, -x)) / 2;
        modeText("cosh", x);
        break;
      case "keyPad_btnTgH":
        retVal = (Math.pow(Math.E, x) - Math.pow(Math.E, -x)) / (Math.pow(Math.E, x) + Math.pow(Math.E, -x));
        modeText("tanh", x);
        break;
      default:
        break;
    }

    if (stackVal2 === 1) {
      stackVal = retVal;
    }
    if (stackVal2 !== 3) {
      stackVal2 = 2;
    }
    stackVal1 = 3;
    boolClear = true;

    if (retVal !== strMathError && retVal !== strInf && !isNaN(retVal)) {
      retVal = formatTcsResult(retVal);
    }
    inBox.value = retVal;
    trig = 0;
    inBox1.value = displayString;
    syncPillDisplay();
  }

  function handleMemory(id) {
    const { inBox, memoryFlag } = getElements();
    if (!inBox) return;
    if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;

    let x = parseFloat(inBox.value);
    if (isNaN(x)) x = 0;
    let retVal = 0;

    switch (id) {
      case "keyPad_MS":
        memory = x;
        if (memoryFlag) {
          memoryFlag.classList.add("memoryshow");
          memoryFlag.classList.remove("memoryhide");
        }
        retVal = inBox.value;
        break;
      case "keyPad_M+":
        memory = x + parseFloat(memory);
        if (memoryFlag) {
          memoryFlag.classList.add("memoryshow");
          memoryFlag.classList.remove("memoryhide");
        }
        retVal = inBox.value;
        break;
      case "keyPad_MR":
        retVal = parseFloat(memory);
        stackVal1 = 1;
        break;
      case "keyPad_MC":
        memory = 0;
        if (memoryFlag) {
          memoryFlag.classList.remove("memoryshow");
          memoryFlag.classList.add("memoryhide");
        }
        retVal = inBox.value;
        break;
      case "keyPad_M-":
        memory = parseFloat(memory) - x;
        if (memoryFlag) {
          memoryFlag.classList.add("memoryshow");
          memoryFlag.classList.remove("memoryhide");
        }
        retVal = inBox.value;
        break;
      default:
        break;
    }

    inBox.value = formatTcsResult(retVal);
    boolClear = true;
    syncPillDisplay();
  }

  function handleCommand(id) {
    const { inBox, inBox1 } = getElements();
    if (!inBox) return;
    let strInput = inBox.value;

    switch (id) {
      case "keyPad_btnEnter": {
        if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;
        while (opCode || opCodeArray.length > 0) {
          if (stackArray[stackArray.length - 1] === "{") {
            stackArray.pop();
          }
          oscBinaryOperation();
          stackVal = stackArray[stackArray.length - 1];
          opCode = opCodeArray[opCodeArray.length - 1];
          stackArray.pop();
          opCodeArray.pop();
        }
        opCode = 0;
        displayString = "";
        trigDisplay = "";
        stackVal = strEmpty;
        openArray = [];

        if (stackVal1 !== 2) {
          if (stackVal1 === 3 || stackVal2 === 1) {
            if (stackVal2 !== 3) strInput = "";
          }
          if (newOpCode === 9) {
            if (strInput.indexOf("-") > -1) {
              inBox1.value = inBox1.value.substring(0, inBox1.value.lastIndexOf("+"));
            } else {
              inBox1.value = inBox1.value.replace("e+0", "e+");
            }
          }
          inBox1.value = inBox1.value + strInput;
        }
        stackVal1 = 2;
        newOpCode = 0;
        stackVal2 = 0;
        stackArray = [];
        opCodeArray = [];
        syncPillDisplay();
        return;
      }
      case "keyPad_btnClr":
        if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;
        if (strInput === strEmpty) {
          opCode = 0;
          boolClear = false;
        } else {
          inBox.value = strEmpty;
        }
        break;
      case "keyPad_btnBack":
        if (stackVal1 === 1 || stackVal2 === 3) {
          if (strInput.length > 1) {
            if (inBox.value.indexOf("Infinity") > -1 || inBox.value.indexOf(strMathError) > -1) return;
            inBox.value = strInput.substring(0, strInput.length - 1);
            if (inBox.value === "-") inBox.value = "0";
          } else {
            inBox.value = "0";
          }
        }
        break;
      case "keyPad_btnAllClr":
        inBox.value = strEmpty;
        displayString = "";
        trigDisplay = "";
        stackArray = [];
        opCodeArray = [];
        openArray = [];
        inBox1.value = "";
        stackVal = strEmpty;
        stackVal1 = 1;
        stackVal2 = 0;
        newOpCode = 0;
        opCode = 0;
        break;
      default:
        break;
    }
    syncPillDisplay();
  }

  // =========================================================================
  // WINDOW CONTROLS: DRAG, RESIZE, FLOAT, OPACITY, THEME
  // =========================================================================

  function applyScale(scale) {
    calcScale = Math.max(0.65, Math.min(1.6, scale));
    const { widget, scaleWrapper, scaleLabel } = getElements();
    if (widget) {
      widget.style.setProperty("--gate-calc-scale", calcScale);
      const baseW = 465;
      widget.style.width = `${Math.round(baseW * calcScale)}px`;
    }
    if (scaleLabel) {
      scaleLabel.innerText = `${Math.round(calcScale * 100)}%`;
    }
    try {
      localStorage.setItem("gate_calc_scale", String(calcScale));
    } catch (e) {}
  }

  function setWindowPosition(left, top) {
    const { widget } = getElements();
    if (!widget || !isFloating) return;

    const scale = calcScale || 1.0;
    const w = widget.offsetWidth > 0 ? widget.offsetWidth : 465 * scale;
    const h = widget.offsetHeight > 0 ? widget.offsetHeight : 380 * scale;
    const maxLeft = Math.max(10, window.innerWidth - w - 10);
    const maxTop = Math.max(10, window.innerHeight - h - 10);

    const clampLeft = Math.max(10, Math.min(left, maxLeft));
    const clampTop = Math.max(10, Math.min(top, maxTop));

    currentPosX = clampLeft;
    currentPosY = clampTop;

    widget.style.left = `${clampLeft}px`;
    widget.style.top = `${clampTop}px`;
    widget.style.right = "auto";
    widget.style.bottom = "auto";

    try {
      localStorage.setItem("gate_calc_pos_x", String(clampLeft));
      localStorage.setItem("gate_calc_pos_y", String(clampTop));
    } catch (e) {}
  }

  function initDraggable() {
    const handle = document.getElementById("gateCalcDragHandle");
    const { widget } = getElements();
    if (!handle || !widget) return;

    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !isFloating) return;
      if (e.target.closest("button, input, select, a, .gate-calc-action-btn")) return;

      const rect = widget.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      handle.setPointerCapture(e.pointerId);
      isDragging = true;
      handle.classList.add("dragging");
    });

    handle.addEventListener("pointermove", (e) => {
      if (!isDragging || !handle.hasPointerCapture(e.pointerId)) return;
      setWindowPosition(e.clientX - offsetX, e.clientY - offsetY);
    });

    const stopDrag = () => {
      if (isDragging) {
        isDragging = false;
        handle.classList.remove("dragging");
      }
    };

    handle.addEventListener("lostpointercapture", stopDrag);
    handle.addEventListener("pointerup", stopDrag);
    handle.addEventListener("pointercancel", stopDrag);

    // Keyboard movement when focused
    handle.setAttribute("tabindex", "0");
    handle.addEventListener("keydown", (e) => {
      if (!isFloating) return;
      const step = 20;
      const rect = widget.getBoundingClientRect();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setWindowPosition(rect.left - step, rect.top);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setWindowPosition(rect.left + step, rect.top);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setWindowPosition(rect.left, rect.top - step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setWindowPosition(rect.left, rect.top + step);
      }
    });
  }

  function initCornerResize() {
    const resizeHandle = document.getElementById("gateCalcResizeHandle");
    const { widget } = getElements();
    if (!resizeHandle || !widget) return;

    let startX = 0;
    let startScale = 1;
    let isResizing = false;

    resizeHandle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startScale = calcScale;
      resizeHandle.setPointerCapture(e.pointerId);
      isResizing = true;
      resizeHandle.classList.add("active");
    });

    resizeHandle.addEventListener("pointermove", (e) => {
      if (!isResizing || !resizeHandle.hasPointerCapture(e.pointerId)) return;
      const deltaX = e.clientX - startX;
      const newScale = startScale + deltaX / 300;
      applyScale(newScale);
    });

    const stopResize = () => {
      if (isResizing) {
        isResizing = false;
        resizeHandle.classList.remove("active");
      }
    };

    resizeHandle.addEventListener("lostpointercapture", stopResize);
    resizeHandle.addEventListener("pointerup", stopResize);
    resizeHandle.addEventListener("pointercancel", stopResize);
  }

  // =========================================================================
  // WINDOW TOGGLE, MINIMIZE, OPACITY, THEME
  // =========================================================================

  function toggleGateCalculator() {
    if (isMinimized) {
      restoreGateCalculator();
    } else if (isVisible) {
      closeGateCalculator();
    } else {
      openGateCalculator();
    }
  }

  function openGateCalculator() {
    const { widget, pill, backdrop } = getElements();
    if (!widget) {
      console.warn("[GATE Calc] gateCalculatorWidget element not found in DOM!");
      return;
    }

    isVisible = true;
    isMinimized = false;
    widget.style.display = "flex";
    widget.style.visibility = "visible";
    widget.classList.remove("hidden");
    if (pill) pill.style.display = "none";

    if (!isFloating) {
      widget.classList.add("gate-calc-modal-mode");
      if (backdrop) backdrop.style.display = "block";
    } else {
      widget.classList.remove("gate-calc-modal-mode");
      if (backdrop) backdrop.style.display = "none";

      const scale = calcScale || 1.0;
      const widgetWidth = 465 * scale;

      let x = currentPosX;
      let y = currentPosY;

      if (typeof x !== "number" || isNaN(x) || x < 0 || x > window.innerWidth - 60) {
        const savedX = parseFloat(localStorage.getItem("gate_calc_pos_x"));
        if (!isNaN(savedX) && savedX > 0 && savedX < window.innerWidth - 60) {
          x = savedX;
        } else {
          x = Math.max(20, window.innerWidth - widgetWidth - 30);
        }
      }

      if (typeof y !== "number" || isNaN(y) || y < 0 || y > window.innerHeight - 60) {
        const savedY = parseFloat(localStorage.getItem("gate_calc_pos_y"));
        if (!isNaN(savedY) && savedY > 0 && savedY < window.innerHeight - 60) {
          y = savedY;
        } else {
          y = 80;
        }
      }

      setWindowPosition(x, y);
    }
    syncPillDisplay();
  }

  function closeGateCalculator() {
    if (calcPipWindow && !calcPipWindow.closed) {
      dockWidgetBackToMainDocument();
    }
    const { widget, pill, backdrop } = getElements();
    if (widget) widget.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
    if (pill) pill.style.display = "none";
    isVisible = false;
    isMinimized = false;
  }

  function minimizeGateCalculator() {
    if (calcPipWindow && !calcPipWindow.closed) {
      dockWidgetBackToMainDocument();
    }
    const { widget, pill, backdrop } = getElements();
    if (widget) widget.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
    if (pill) {
      pill.style.display = "flex";
      syncPillDisplay();
    }
    isVisible = false;
    isMinimized = true;
  }

  function restoreGateCalculator() {
    openGateCalculator();
  }

  function toggleFloatMode() {
    const { widget, backdrop } = getElements();
    if (!widget) return;

    isFloating = !isFloating;
    if (isFloating) {
      widget.classList.remove("gate-calc-modal-mode");
      if (backdrop) backdrop.style.display = "none";
      setWindowPosition(currentPosX || 100, currentPosY || 100);
    } else {
      widget.classList.add("gate-calc-modal-mode");
      if (backdrop && isVisible) backdrop.style.display = "block";
      widget.style.left = "50%";
      widget.style.top = "50%";
    }
    try {
      localStorage.setItem("gate_calc_is_floating", String(isFloating));
    } catch (e) {}
  }

  // =========================================================================
  // DOCUMENT PICTURE-IN-PICTURE (PIP) / ALWAYS-ON-TOP FLOATING WINDOW ENGINE
  // =========================================================================
  let calcPipWindow = null;
  let pipPlaceholder = null;

  async function toggleGateCalculatorPip() {
    if (calcPipWindow && !calcPipWindow.closed) {
      closeGateCalculatorPip();
    } else {
      await openGateCalculatorPip();
    }
  }

  async function openGateCalculatorPip() {
    ensureInit();
    const { widget, backdrop, pill } = getElements();
    if (!widget) return;

    // If already open, bring to front
    if (calcPipWindow && !calcPipWindow.closed) {
      calcPipWindow.focus();
      return;
    }

    if (backdrop) backdrop.style.display = "none";
    if (pill) pill.style.display = "none";
    isMinimized = false;
    isVisible = true;

    // 1. Modern Document Picture-in-Picture API (Chrome, Edge, Opera, Brave, Arc)
    if ("documentPictureInPicture" in window) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 485,
          height: 440
        });
        calcPipWindow = pipWin;
        setupPipEnvironment(pipWin, widget);
        return;
      } catch (err) {
        console.warn("[GATE Calc] Document Picture-in-Picture request failed or dismissed:", err);
      }
    }

    // 2. Standalone OS Pop-up fallback (Firefox, Safari, older browsers)
    try {
      const left = window.screenLeft ? window.screenLeft + 120 : 120;
      const top = window.screenTop ? window.screenTop + 80 : 80;
      const popWin = window.open(
        "",
        "GATE_Calculator_Float",
        `width=485,height=440,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      );
      if (popWin) {
        calcPipWindow = popWin;
        setupPipEnvironment(popWin, widget);
      } else {
        alert("Floating window was blocked by your browser. Please allow pop-ups for this site or use Google Chrome / Microsoft Edge for Always-On-Top Picture-in-Picture.");
      }
    } catch (e) {
      console.error("[GATE Calc] Float window fallback error:", e);
    }
  }

  function setupPipEnvironment(win, widget) {
    try {
      win.document.title = "GATE 2027 Scientific Calculator";

      // Include FontAwesome
      const faLink = win.document.createElement("link");
      faLink.rel = "stylesheet";
      faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      win.document.head.appendChild(faLink);

      // Include TCS Calculator stylesheet
      const calcCss = win.document.createElement("link");
      calcCss.rel = "stylesheet";
      calcCss.href = "tcs-calculator.css";
      win.document.head.appendChild(calcCss);

      // Dedicated PiP Styles
      const pipStyle = win.document.createElement("style");
      pipStyle.textContent = `
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #181920;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: auto;
          display: flex;
          flex-direction: column;
          user-select: none;
        }
        #gateCalculatorWidget {
          position: static !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          transform: none !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100vh !important;
          border-radius: 0 !important;
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        .gate-calc-scale-wrapper {
          margin: 0 auto !important;
          transform-origin: top center !important;
        }
        .gate-calc-resize-handle {
          display: none !important;
        }
      `;
      win.document.head.appendChild(pipStyle);

      // Placeholder to preserve exact position in parent DOM
      if (!pipPlaceholder) {
        pipPlaceholder = document.createComment("gate-calc-pip-placeholder");
      }
      if (widget.parentNode && widget.parentNode !== win.document.body) {
        widget.parentNode.insertBefore(pipPlaceholder, widget);
      }

      // Move calculator into PiP window
      widget.classList.add("gate-calc-pip-mode");
      widget.style.display = "flex";
      widget.style.visibility = "visible";
      widget.classList.remove("hidden");
      win.document.body.appendChild(widget);

      // Update button icon states
      updatePipButtonIcons(true);

      // Attach keyboard handler in the floating PiP window
      win.document.addEventListener("keydown", (e) => {
        handleGlobalCalculatorKey(e);
      });

      // Cleanup and dock back on close/unload
      const handleDock = () => {
        dockWidgetBackToMainDocument();
      };

      win.addEventListener("pagehide", handleDock);
      win.addEventListener("unload", handleDock);
      win.addEventListener("beforeunload", handleDock);
    } catch (err) {
      console.error("[GATE Calc] setupPipEnvironment error:", err);
    }
  }

  function dockWidgetBackToMainDocument() {
    const { widget } = getElements();
    if (!widget) return;

    widget.classList.remove("gate-calc-pip-mode");

    if (pipPlaceholder && pipPlaceholder.parentNode) {
      pipPlaceholder.parentNode.insertBefore(widget, pipPlaceholder);
      pipPlaceholder.remove();
      pipPlaceholder = null;
    } else if (widget.parentNode !== document.body) {
      document.body.appendChild(widget);
    }

    if (calcPipWindow && !calcPipWindow.closed) {
      try {
        calcPipWindow.close();
      } catch (e) {}
    }
    calcPipWindow = null;
    updatePipButtonIcons(false);

    // Restore in-page geometry
    if (isFloating) {
      widget.classList.remove("gate-calc-modal-mode");
      setWindowPosition(currentPosX || 100, currentPosY || 100);
    } else {
      widget.classList.add("gate-calc-modal-mode");
    }
  }

  function closeGateCalculatorPip() {
    dockWidgetBackToMainDocument();
  }

  function updatePipButtonIcons(isInPip) {
    const pipBtns = document.querySelectorAll(".gate-calc-btn-pip, #gateCalcPipBtn");
    pipBtns.forEach((btn) => {
      if (isInPip) {
        btn.classList.add("active");
        btn.innerHTML = `<i class="fa-solid fa-arrow-down-left-and-up-right-to-center"></i>`;
        btn.title = "Dock calculator back into main page";
      } else {
        btn.classList.remove("active");
        btn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
        btn.title = "Float over any tab or window (Always-On-Top Picture-in-Picture) [Alt+Shift+C]";
      }
    });
  }

  function toggleGhostOpacity() {
    const { widget } = getElements();
    if (!widget) return;
    isGhost = (isGhost + 1) % 3;
    const opacities = [1.0, 0.85, 0.65];
    widget.style.setProperty("--gate-calc-opacity", opacities[isGhost]);
  }

  function toggleCalcTheme() {
    const { widget } = getElements();
    if (!widget) return;
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      widget.classList.add("theme-dark-command");
    } else {
      widget.classList.remove("theme-dark-command");
    }
    try {
      localStorage.setItem("gate_calc_theme_dark", String(isDarkMode));
    } catch (e) {}
  }

  function toggleInputPracticeMode() {
    const { modeBadge } = getElements();
    isPracticeKeys = !isPracticeKeys;
    if (modeBadge) {
      modeBadge.innerText = isPracticeKeys
        ? "Practice Mode (Keys Enabled)"
        : "Exam Mode (Mouse Only)";
      modeBadge.style.color = isPracticeKeys ? "#34d399" : "#60a5fa";
    }
  }

  function copyResultToClipboard() {
    const { inBox, copyBtn } = getElements();
    if (!inBox) return;
    const text = inBox.value || "0";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (copyBtn) {
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
          }, 1200);
        }
      });
    }
  }

  // =========================================================================
  // KEYBOARD EVENTS (Practice Mode)
  // =========================================================================
  function handleGlobalCalculatorKey(e) {
    // Global shortcut Alt+C to toggle calculator
    if (e.altKey && !e.shiftKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      toggleGateCalculator();
      return;
    }

    // Global shortcut Alt+Shift+C or Alt+P to toggle Picture-in-Picture float mode
    if (e.altKey && ((e.shiftKey && (e.key === "c" || e.key === "C")) || e.key === "p" || e.key === "P")) {
      e.preventDefault();
      toggleGateCalculatorPip();
      return;
    }

    // If calculator is not open, ignore other keys
    if (!isVisible || isMinimized) return;

    // Practice mode numpad & key handlers
    if (!isPracticeKeys) return;

    // Ignore if user is currently typing in an input elsewhere
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
      !activeEl.classList.contains("keyPad_TextBox")
    ) {
      return;
    }

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      handleNumeric(e.key);
    } else if (e.key === ".") {
      e.preventDefault();
      handleNumeric(".");
    } else if (e.key === "+") {
      e.preventDefault();
      handleBinary("keyPad_btnPlus", "+");
    } else if (e.key === "-") {
      e.preventDefault();
      handleBinary("keyPad_btnMinus", "-");
    } else if (e.key === "*") {
      e.preventDefault();
      handleBinary("keyPad_btnMult", "*");
    } else if (e.key === "/") {
      e.preventDefault();
      handleBinary("keyPad_btnDiv", "/");
    } else if (e.key === "%") {
      e.preventDefault();
      handleBinary("keyPad_%", "%");
    } else if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      handleCommand("keyPad_btnEnter");
    } else if (e.key === "Backspace") {
      e.preventDefault();
      handleCommand("keyPad_btnBack");
    } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
      e.preventDefault();
      handleCommand("keyPad_btnAllClr");
    }
  }

  function initKeyboardEvents() {
    document.addEventListener("keydown", handleGlobalCalculatorKey);
    window.addEventListener("beforeunload", () => {
      if (calcPipWindow && !calcPipWindow.closed) {
        calcPipWindow.close();
      }
    });
  }

  // =========================================================================
  // SETUP EVENT DELEGATION FOR ALL BUTTONS
  // =========================================================================
  function initEvents() {
    const { widget } = getElements();
    if (!widget) return;

    // Delegate keypad button clicks
    widget.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();

      const id = a.id;
      const text = a.innerText.trim();

      if (a.classList.contains("keyPad_btnNumeric")) {
        handleNumeric(text);
      } else if (a.classList.contains("keyPad_btnConst")) {
        handleConst(id);
      } else if (a.classList.contains("keyPad_btnBinaryOp")) {
        handleBinary(id, text);
      } else if (a.classList.contains("keyPad_btnUnaryOp")) {
        handleUnary(id, text);
      } else if (a.classList.contains("keyPad_btnMemoryOp")) {
        handleMemory(id);
      } else if (a.classList.contains("keyPad_btnCommand")) {
        handleCommand(id);
      }
    });

    // Degree / Radian radios
    const radios = widget.querySelectorAll('input[name="degree_or_radian"]');
    radios.forEach((r) => {
      r.addEventListener("change", (e) => {
        modeSelected = e.target.value;
      });
    });

    // Help Button
    const helpBtn = document.getElementById("keyPad_Help");
    const helpBackBtn = document.getElementById("keyPad_Helpback");
    const helpContent = document.getElementById("helpContent");
    const mainContentArea = document.getElementById("mainContentArea");

    if (helpBtn && helpBackBtn && helpContent) {
      helpBtn.addEventListener("click", (e) => {
        e.preventDefault();
        helpBtn.style.display = "none";
        helpBackBtn.style.display = "inline-block";
        helpContent.style.display = "block";
        const leftSec = widget.querySelector(".left_sec");
        const screenWrap = widget.querySelector(".gate-calc-screen-wrap");
        if (leftSec) leftSec.style.display = "none";
        if (screenWrap) screenWrap.style.display = "none";
      });

      helpBackBtn.addEventListener("click", (e) => {
        e.preventDefault();
        helpBackBtn.style.display = "none";
        helpBtn.style.display = "inline-block";
        helpContent.style.display = "none";
        const leftSec = widget.querySelector(".left_sec");
        const screenWrap = widget.querySelector(".gate-calc-screen-wrap");
        if (leftSec) leftSec.style.display = "block";
        if (screenWrap) screenWrap.style.display = "block";
      });
    }

    // Official Minimize Button (#calc_min)
    const calcMin = document.getElementById("calc_min");
    if (calcMin && mainContentArea) {
      calcMin.addEventListener("click", () => {
        if (mainContentArea.style.display === "none") {
          mainContentArea.style.display = "block";
          if (helpBtn) helpBtn.style.display = "inline-block";
        } else {
          mainContentArea.style.display = "none";
          if (helpBtn) helpBtn.style.display = "none";
          if (helpBackBtn) helpBackBtn.style.display = "none";
          if (helpContent) helpContent.style.display = "none";
        }
      });
    }

    // Titlebar Actions
    const closeBtn = document.getElementById("gateCalcCloseBtn");
    if (closeBtn) closeBtn.onclick = () => closeGateCalculator();

    const minimizeBtn = document.getElementById("gateCalcMinimizeBtn");
    if (minimizeBtn) minimizeBtn.onclick = () => minimizeGateCalculator();

    const floatModeBtn = document.getElementById("gateCalcFloatModeBtn");
    if (floatModeBtn) floatModeBtn.onclick = () => toggleFloatMode();

    const pipBtn = document.getElementById("gateCalcPipBtn");
    if (pipBtn) pipBtn.onclick = () => toggleGateCalculatorPip();

    const opacityBtn = document.getElementById("gateCalcOpacityBtn");
    if (opacityBtn) opacityBtn.onclick = () => toggleGhostOpacity();

    const themeBtn = document.getElementById("gateCalcThemeBtn");
    if (themeBtn) themeBtn.onclick = () => toggleCalcTheme();

    const inputModeBtn = document.getElementById("gateCalcInputModeBtn");
    if (inputModeBtn) inputModeBtn.onclick = () => toggleInputPracticeMode();

    const copyBtn = document.getElementById("gateCalcCopyBtn");
    if (copyBtn) copyBtn.onclick = () => copyResultToClipboard();

    // Scale Controls
    const zoomInBtn = document.getElementById("gateCalcZoomInBtn");
    if (zoomInBtn) zoomInBtn.onclick = () => applyScale(calcScale + 0.1);

    const zoomOutBtn = document.getElementById("gateCalcZoomOutBtn");
    if (zoomOutBtn) zoomOutBtn.onclick = () => applyScale(calcScale - 0.1);

    const scaleLabel = document.getElementById("gateCalcScaleLabel");
    const scaleMenu = document.getElementById("gateCalcScaleMenu");
    if (scaleLabel && scaleMenu) {
      scaleLabel.onclick = () => {
        scaleMenu.style.display =
          scaleMenu.style.display === "none" ? "block" : "none";
      };

      scaleMenu.querySelectorAll("button[data-scale]").forEach((btn) => {
        btn.onclick = () => {
          const s = parseFloat(btn.getAttribute("data-scale"));
          applyScale(s);
          scaleMenu.style.display = "none";
          scaleMenu.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        };
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest("#gateCalcScaleLabel") && !e.target.closest("#gateCalcScaleMenu")) {
          scaleMenu.style.display = "none";
        }
      });
    }
  }

  // =========================================================================
  // INITIALIZATION ON DOM READY
  // =========================================================================
  function ensureInit() {
    if (isInitialized) return;
    const widget = document.getElementById("gateCalculatorWidget");
    if (!widget) return; // Wait until DOM is available

    isInitialized = true;

    // Restore saved settings
    try {
      const savedScale = localStorage.getItem("gate_calc_scale");
      if (savedScale) {
        calcScale = parseFloat(savedScale);
      }
      applyScale(calcScale);

      const savedDark = localStorage.getItem("gate_calc_theme_dark");
      if (savedDark === "true") {
        isDarkMode = true;
        widget.classList.add("theme-dark-command");
      }

      const savedFloat = localStorage.getItem("gate_calc_is_floating");
      if (savedFloat === "false") {
        isFloating = false;
        widget.classList.add("gate-calc-modal-mode");
      }
    } catch (e) {}

    initDraggable();
    initCornerResize();
    initEvents();
    initKeyboardEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureInit);
  } else {
    ensureInit();
  }
})();
