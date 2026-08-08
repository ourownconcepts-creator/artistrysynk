import os
import re
import json

wrappers = ["ProtectedRoute", "AdminProtectedRoute"]
paths = ["src", "/tmp/migrate-to-tanstack/App.tsx.bak", "/tmp/migrate-to-tanstack/route-config-backups/"]

results = {w: [] for w in wrappers}

def get_opening_tag(content, start_pos):
    # Find the end of the opening tag > or />
    # Taking into account potential strings and nested braces is hard with regex,
    # but for JSX usually we can look for the first > that isn't inside quotes or braces.
    pos = start_pos
    in_quotes = False
    quote_char = ''
    brace_level = 0
    
    while pos < len(content):
        char = content[pos]
        if char in ['"', "'", "`"] and (pos == 0 or content[pos-1] != '\\'):
            if not in_quotes:
                in_quotes = True
                quote_char = char
            elif char == quote_char:
                in_quotes = False
        elif not in_quotes:
            if char == '{':
                brace_level += 1
            elif char == '}':
                brace_level -= 1
            elif char == '>' and brace_level == 0:
                return content[start_pos:pos+1]
        pos += 1
    return content[start_pos:]

def parse_props(tag):
    # Extract props from the tag
    # This is a simple parser
    props = []
    # Remove <WrapperName and trailing > or />
    body = re.sub(r'^<[A-Za-z0-0]+\s*', '', tag)
    body = re.sub(r'\s*/?>$', '', body)
    
    # Regex to find key={value} or key="value" or key
    # This is not perfect but should handle common cases
    pattern = r'([a-zA-Z0-9_-]+)(?:=(?:{([^}]*)}|"([^"]*)"|\'([^\']*)\'))?'
    for match in re.finditer(pattern, body):
        name = match.group(1)
        value = None
        source = None
        if match.group(2) is not None:
            value = match.group(2)
            source = f"{{{value}}}"
        elif match.group(3) is not None:
            value = match.group(3)
            source = f'"{value}"'
        elif match.group(4) is not None:
            value = match.group(4)
            source = f"'{value}'"
        else:
            value = "true" # boolean prop
            source = name
        
        if name != "children":
            props.append({"name": name, "value": value, "source": source})
    
    return props

for root_path in paths:
    if not os.path.exists(root_path): continue
    
    for root, dirs, files in os.walk(root_path):
        for file in files:
            if not file.endswith(('.tsx', '.jsx', '.bak')): continue
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
            except:
                continue
                
            for w in wrappers:
                # Find all <W followed by space, >, or /
                pattern = f"<{w}[\\s>/]"
                for match in re.finditer(pattern, content):
                    start_pos = match.start()
                    line_no = content.count('\n', 0, start_pos) + 1
                    
                    opening_tag = get_opening_tag(content, start_pos)
                    # Flatten whitespace
                    opening_tag_flat = " ".join(opening_tag.split())
                    
                    props = parse_props(opening_tag)
                    
                    # Context: 2 lines before and after
                    lines = content.splitlines()
                    start_line = max(0, line_no - 3)
                    end_line = min(len(lines), line_no + 2)
                    context = "\n".join(lines[start_line:end_line])
                    
                    results[w].append({
                        "file": file_path,
                        "line": line_no,
                        "openingTag": opening_tag_flat,
                        "props": props,
                        "context": context
                    })

print(json.dumps(results))
