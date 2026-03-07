window.renderDiff = function(diffText, containerEl) {
    if (!window.Diff2Html) {
        containerEl.textContent = "Diff2Html not loaded.";
        return;
    }

    let diffs;
    try {
        diffs = Diff2Html.parse(diffText);
    } catch(e) {
        containerEl.textContent = "Error parsing diff: " + e.message;
        return;
    }
    
    if (!diffs || diffs.length === 0) {
        containerEl.innerHTML = '<div style="padding:1em; text-align:center; color:#888;">No changes.</div>';
        return;
    }

    containerEl.innerHTML = ''; // clear

    diffs.forEach(d => {
        let name = d.newName.replace(/^b\//, '') || d.oldName.replace(/^a\//, '');
        
        const card = document.createElement('div');
        card.className = 'file-card collapsed';
        
        const header = document.createElement('div');
        header.className = 'file-header';
        header.onclick = (e) => {
            if (e.target.closest('.btn-save-header')) return;
            card.classList.toggle('collapsed');
            if (!card.classList.contains('collapsed') && card.cm) {
                setTimeout(() => {
                    card.cm.refresh();
                    highlightInlineDiffs(card.cm);
                }, 50);
            }
        };

        const nameDiv = document.createElement('div');
        nameDiv.className = 'file-name';
        nameDiv.textContent = name;
        
        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn-save-header fat-btn-small';
        applyBtn.textContent = 'APPLY PATCH';
        
        applyBtn.onpointerdown = (e) => {
            e.stopPropagation();
            const patchText = card.cm ? card.cm.getValue() : extractRawDiff(diffText, d);
            const cmd = `cat << 'EOF_PATCH' | git apply --whitespace=nowarn\n${patchText}\nEOF_PATCH\n`;
            window.kit.say(cmd, 'prompt.try');
        };
        
        applyBtn.onclick = (e) => {
            e.stopPropagation();
            const patchText = card.cm ? card.cm.getValue() : extractRawDiff(diffText, d);
            const cmd = `cat << 'EOF_PATCH' | git apply --whitespace=nowarn\n${patchText}\nEOF_PATCH\n`;
            window.kit.say(cmd, 'prompt');
        };

        const chevron = document.createElement('div');
        chevron.className = 'chevron';
        chevron.innerHTML = '&#9660;';

        header.appendChild(nameDiv);
        header.appendChild(applyBtn);
        header.appendChild(chevron);
        
        const content = document.createElement('div');
        content.className = 'file-content';
        
        const ta = document.createElement('textarea');
        ta.value = extractRawDiff(diffText, d);
        content.appendChild(ta);
        
        card.appendChild(header);
        card.appendChild(content);
        containerEl.appendChild(card);
        
        const cm = window.CodeMirror.fromTextArea(ta, {
            mode: 'diff',
            lineNumbers: true,
            lineWrapping: true,
            viewportMargin: Infinity,
            theme: 'default' 
        });
        
        // Add padding to bottom so fat thumbs can tap
        cm.getWrapperElement().style.paddingBottom = "5em";
        cm.getWrapperElement().style.fontSize = "1.2em"; // fat thumb friendly
        cm.getWrapperElement().style.letterSpacing = "0.05em"; // wide letter spacing
        cm.getWrapperElement().style.fontFamily = "'Courier New', monospace";
        
        let timeout;
        cm.on('change', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => highlightInlineDiffs(cm), 300);
        });
        
        card.cm = cm;
    });
}

function extractRawDiff(fullDiff, diffObj) {
    const lines = fullDiff.split(/\r?\n/);
    let startIdx = -1;
    let endIdx = lines.length;
    
    const targetHeader = `diff --git ${diffObj.oldName} ${diffObj.newName}`;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('diff --git ') && startIdx !== -1) {
            endIdx = i;
            break;
        }
        if (lines[i].startsWith(targetHeader)) {
            startIdx = i;
        }
    }
    
    if (startIdx !== -1) {
        return lines.slice(startIdx, endIdx).join('\n') + '\n';
    }
    return '';
}

function highlightInlineDiffs(cm) {
    // Clear old inline marks
    cm.getAllMarks().forEach(m => m.clear());
    
    const getCommon = (s1, s2) => {
        let pre = 0;
        while(pre < s1.length && pre < s2.length && s1[pre] === s2[pre]) pre++;
        let suf = 0;
        while(suf < s1.length - pre && suf < s2.length - pre && s1[s1.length - 1 - suf] === s2[s2.length - 1 - suf]) suf++;
        return [pre, suf];
    };

    const doc = cm.getDoc();
    const lineCount = doc.lineCount();
    
    let pendingDelLine = -1;
    let pendingDelText = null;

    for (let i = 0; i < lineCount; i++) {
        const lineText = doc.getLine(i);
        if (lineText.startsWith('-') && !lineText.startsWith('--- ')) {
            pendingDelLine = i;
            pendingDelText = lineText.substring(1);
        } else if (lineText.startsWith('+') && !lineText.startsWith('+++ ')) {
            if (pendingDelLine !== -1 && pendingDelLine === i - 1) {
                const addText = lineText.substring(1);
                const [pre, suf] = getCommon(pendingDelText, addText);
                
                if (pendingDelText.length - suf > pre || addText.length - suf > pre) {
                    // Mark delete
                    cm.markText(
                        {line: pendingDelLine, ch: pre + 1},
                        {line: pendingDelLine, ch: pendingDelText.length - suf + 1},
                        {className: 'cm-diff-inline-del'}
                    );
                    // Mark add
                    cm.markText(
                        {line: i, ch: pre + 1},
                        {line: i, ch: addText.length - suf + 1},
                        {className: 'cm-diff-inline-add'}
                    );
                }
            }
            pendingDelLine = -1;
            pendingDelText = null;
        } else {
            pendingDelLine = -1;
            pendingDelText = null;
        }
    }
}