(function () {
            const exprEl = document.getElementById('expression');
            const resEl = document.getElementById('result');
            const keys = document.getElementById('keys');

            // Current expression string (tokens like "12.3", "+", "(", ")")
            let expr = "";

            // Helpers
            const isOperator = s => ['+', '-', '*', '/'].includes(s);
            const isDigit = ch => /\d/.test(ch);

            function updateDisplay() {
                exprEl.textContent = expr === "" ? '0' : expr;
                // Try to show a quick preview: evaluate last valid part (safe)
                try {
                    if (expr && !/[+\-*/]$/.test(expr)) {
                        const val = evaluateExpression(expr);
                        resEl.textContent = String(val);
                    } else {
                        resEl.textContent = '…';
                    }
                } catch (e) {
                    resEl.textContent = 'Error';
                }
            }

            // Append token/value with basic validation
            function pushValue(val) {
                if (val === '.') {
                    // don't allow multiple decimals in the current number
                    const match = expr.match(/([0-9]*\.?[0-9]*)$/);
                    const lastNum = match ? match[0] : '';
                    if (lastNum.includes('.')) return;
                    // if starts with '.' prepend '0'
                    if (lastNum === '') {
                        expr += '0';
                    }
                    expr += '.';
                    updateDisplay();
                    return;
                }

                if (isOperator(val)) {
                    if (expr === "") {
                        // allow leading minus for negative numbers
                        if (val === '-') {
                            expr = '-';
                            updateDisplay();
                        }
                        return;
                    }
                    // avoid consecutive operators
                    if (isOperator(expr.slice(-1))) {
                        // allow replacing operator with new one
                        expr = expr.slice(0, -1) + val;
                        updateDisplay();
                        return;
                    }
                    expr += val;
                    updateDisplay();
                    return;
                }

                // digits or parentheses
                expr += val;
                updateDisplay();
            }

            function clearAll() {
                expr = "";
                updateDisplay();
            }
            function backspace() {
                if (expr.length) expr = expr.slice(0, -1);
                updateDisplay();
            }

            // Percent: convert last number to its percent value (e.g. "50" -> "0.5")
            function percent() {
                // find last number
                const m = expr.match(/([0-9]*\.?[0-9]+)$/);
                if (!m) return;
                const n = m[1];
                const replaced = (parseFloat(n) / 100).toString();
                expr = expr.slice(0, expr.length - n.length) + replaced;
                updateDisplay();
            }

            // Click handling
            keys.addEventListener('click', e => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const action = btn.dataset.action;
                const value = btn.dataset.value;

                if (action === 'clear') return clearAll();
                if (action === 'back') return backspace();
                if (action === 'percent') return percent();
                if (action === 'equals') return calculate();
                if (value !== undefined) return pushValue(value);
            });

            // Keyboard support
            window.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === '=') { ev.preventDefault(); calculate(); return; }
                if (ev.key === 'Backspace') { ev.preventDefault(); backspace(); return; }
                if (ev.key === 'Escape') { ev.preventDefault(); clearAll(); return; }
                if (ev.key === '%') { ev.preventDefault(); percent(); return; }

                const allowed = '0123456789.+-*/()';
                if (allowed.includes(ev.key)) {
                    ev.preventDefault();
                    // normalize × ÷ to * /
                    let k = ev.key;
                    pushValue(k);
                }
            });

            // Calculate: tokenization -> shunting-yard -> evaluate RPN
            function calculate() {
                if (!expr) return;
                try {
                    const val = evaluateExpression(expr);
                    expr = String(val); // replace expression with result for further calculations
                    updateDisplay();
                } catch (err) {
                    resEl.textContent = 'Error';
                    // keep expr so user can edit
                    console.error('Evaluation error:', err);
                }
            }

            // -----------------------------
            // Expression evaluation (shunting-yard + RPN)
            // -----------------------------

            function tokenize(str) {
                const tokens = [];
                let i = 0;
                while (i < str.length) {
                    const ch = str[i];
                    if (ch === ' ') { i++; continue; }

                    // number (integer or decimal)
                    if (isDigit(ch) || ch === '.') {
                        let num = ch;
                        i++;
                        while (i < str.length && (isDigit(str[i]) || str[i] === '.')) {
                            num += str[i++];
                        }
                        tokens.push(num);
                        continue;
                    }

                    // operators and parentheses
                    if (['+', '-', '*', '/', '(', ')'].includes(ch)) {
                        // handle unary minus: if '-' and (start or previous is operator or '(')
                        if (ch === '-') {
                            const prev = tokens.length ? tokens[tokens.length - 1] : null;
                            if (prev === null || (typeof prev === 'string' && (isOperator(prev) || prev === '('))) {
                                // unary minus: treat as '0' and '-' operator to simplify
                                tokens.push('0');
                            }
                        }
                        tokens.push(ch);
                        i++;
                        continue;
                    }

                    throw new Error('Invalid character: ' + ch);
                }
                return tokens;
            }

            function precedence(op) {
                if (op === '+' || op === '-') return 1;
                if (op === '*' || op === '/') return 2;
                return 0;
            }

            function shuntingYard(tokens) {
                const output = [];
                const ops = [];

                tokens.forEach(token => {
                    if (!isNaN(token)) {
                        // number
                        output.push(token);
                    } else if (isOperator(token)) {
                        while (ops.length && isOperator(ops[ops.length - 1]) &&
                            ((precedence(token) <= precedence(ops[ops.length - 1])))) {
                            output.push(ops.pop());
                        }
                        ops.push(token);
                    } else if (token === '(') {
                        ops.push(token);
                    } else if (token === ')') {
                        while (ops.length && ops[ops.length - 1] !== '(') {
                            output.push(ops.pop());
                        }
                        if (!ops.length) throw new Error('Mismatched parentheses');
                        ops.pop(); // remove '('
                    } else {
                        throw new Error('Unknown token: ' + token);
                    }
                });

                while (ops.length) {
                    const op = ops.pop();
                    if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
                    output.push(op);
                }

                return output;
            }

            function evalRPN(rpn) {
                const stack = [];
                rpn.forEach(tok => {
                    if (!isNaN(tok)) {
                        stack.push(parseFloat(tok));
                    } else if (isOperator(tok)) {
                        if (stack.length < 2) throw new Error('Invalid expression');
                        const b = stack.pop();
                        const a = stack.pop();
                        let res;
                        if (tok === '+') res = a + b;
                        else if (tok === '-') res = a - b;
                        else if (tok === '*') res = a * b;
                        else if (tok === '/') {
                            if (b === 0) throw new Error('Division by zero');
                            res = a / b;
                        } else throw new Error('Unsupported operator: ' + tok);
                        stack.push(res);
                    } else {
                        throw new Error('Invalid RPN token: ' + tok);
                    }
                });
                if (stack.length !== 1) throw new Error('Invalid RPN evaluation');
                // reduce floating point noise
                let final = stack[0];
                if (!Number.isInteger(final)) {
                    final = parseFloat(final.toFixed(12)); // avoid long floats
                }
                return final;
            }

            function evaluateExpression(stringExpr) {
                const tokens = tokenize(stringExpr);
                const rpn = shuntingYard(tokens);
                return evalRPN(rpn);
            }

            // initialize
            updateDisplay();
})();