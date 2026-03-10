window.renderStatus = function(statusText, containerEl) {
    const lines = statusText.split(/\r?\n/);
    containerEl.innerHTML = '';
    
    const listDiv = document.createElement('div');
    listDiv.className = 'ls'; // Reuse the ls style layout
    
    if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
        listDiv.innerHTML = '<div style="padding:1em; text-align:center; color:#888;">Working tree clean.</div>';
        containerEl.appendChild(listDiv);
        return;
    }

    lines.forEach(line => {
        if (!line.trim()) return;
        
        let fileStr = "";
        let statusStr = "";
        
        // Match short format (e.g. " M file.js")
        const matchShort = line.match(/^([ MADRCU?!]{2})\s+(.+)$/);
        // Match long format (e.g. "\tmodified:   file.js" or "  new file: file.js")
        const matchLong = line.match(/^[\t ]+(?:([a-z ]+):\s+)?(.+)$/);

        // Ignore typical hint and status lines in long output
        const isHint = line.trim().startsWith('(') || line.trim().startsWith('no changes') || line.trim().startsWith('nothing to commit') || line.trim().startsWith('Changes');
        
        if (matchShort && !line.match(/^[\t ]/)) {
            statusStr = matchShort[1];
            fileStr = matchShort[2].trim();
        } else if (matchLong && !isHint) {
            const action = matchLong[1] ? matchLong[1].trim() : '';
            let path = matchLong[2].trim();
            fileStr = path;
            
            // Handle renamed files
            if (path.includes(' -> ')) {
                fileStr = path.split(' -> ')[1];
            }
            
            if (action.includes('modified')) statusStr = ' M';
            else if (action.includes('new file')) statusStr = 'A ';
            else if (action.includes('deleted')) statusStr = ' D';
            else if (action.includes('renamed')) statusStr = ' R';
            else if (!action) statusStr = '??';
            else statusStr = ' M';
        }
        
        if (!fileStr || isHint) {
            // This is regular text (like "On branch main")
            const textDiv = document.createElement('div');
            textDiv.style.cssText = "width: 100%; grid-column: 1 / -1; color: #eee; text-align: left; font-family: 'Courier New', monospace; padding: 0.2em 1em; white-space: pre-wrap;";
            textDiv.textContent = line;
            listDiv.appendChild(textDiv);
            return;
        }

        const a = document.createElement('div');
        a.className = 'status-item';
        
        // Determine coloring based on status
        let color = 'white';
        let icon = '📄';
        if (statusStr.includes('M')) { color = '#00ffc8'; icon = '📝'; } // Modified
        else if (statusStr.includes('?')) { color = '#ff0055'; icon = '✨'; } // Untracked
        else if (statusStr.includes('A')) { color = '#34c759'; icon = '➕'; } // Added
        else if (statusStr.includes('D')) { color = '#ff3b30'; icon = '🗑️'; } // Deleted
        
        a.innerHTML = `<span style="font-size:1.5em; filter: drop-shadow(0 0 5px ${color});">${icon}</span><br/><span style="color:${color};">${fileStr}</span><br/><span style="font-size:0.7em; opacity:0.6; color:${color};">[${statusStr}]</span>`;
        
        const isStagedOnly = statusStr[1] === ' ' && statusStr[0] !== ' ' && statusStr[0] !== '?';
        const diffFlag = isStagedOnly ? '--cached' : '';
        
        a.onpointerdown = () => {
            if (statusStr.includes('?')) {
                window.kit.say(`cat "${fileStr}"`, 'prompt.try');
            } else {
                window.kit.say(`git diff ${diffFlag} "${fileStr}"`, 'prompt.try');
            }
        };
        
        a.onclick = () => {
            if (statusStr.includes('?')) {
                window.kit.say(`cat "${fileStr}"`, 'prompt');
            } else {
                window.kit.say(`git diff ${diffFlag} "${fileStr}"`, 'prompt');
            }
        };
        
        listDiv.appendChild(a);
    });
    
    containerEl.appendChild(listDiv);
}
