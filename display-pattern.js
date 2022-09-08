function convert_pattern_text(pattern) {
    // strip spaces and split into lines. adding commas to the end makes our
    // lives easier
    pattern = pattern.replaceAll(' ', '').split('\n').map(p => p + ',')
    // drop all lines that start with # or //
    pattern = pattern.filter(p => !p.startsWith('#') && !p.startsWith('//'))
    // find bracketed sections, and repeat them
    duplicate_regex = /\[([0-9,a-z]+)\]\*([0-9]+)/g
    pattern = pattern.map(p => p.replace(duplicate_regex, (match, a, b) => `${a},`.repeat(b)))
    // expand N: e.g., 3sc -> 1sc,1sc,1sc
    stitch_regex = /([0-9]+)([a-z]+)[,$]/g
    pattern = pattern.map(p => p.replace(stitch_regex, (match, a, b) => `1${b},`.repeat(a)))
    // split each line of pattern into an array of stitches (and drop empty ones)
    pattern = pattern.map(p => p.split(',').filter(p => p))
    // fill in colors, row, stitch number
    current_color = pattern[0][0].split('1')[0]
    stitches = []
    for (let i in pattern) {
        row = []
        for (let j in pattern[i]) {
            if (pattern[i][j].split('1')[0]) {
                current_color = pattern[i][j].split('1')[0]
            } else if (secondary_color != current_color) {
                current_color = secondary_color
            }
            if (pattern[i][j].split('1')[1].replace('inc', '').replace('sc', '').replace('dec', '')) {
                secondary_color = pattern[i][j].split('1')[1].replace('inc', '').replace('sc', '').replace('dec', '')
            } else {
                secondary_color = current_color
            }
            row = row.concat(new Array([current_color,pattern[i][j].split('1')[1].replace(secondary_color, ''), Number(i), Number(j), secondary_color]))
        }
        stitches = stitches.concat(row)
    }
    return stitches
}

function display_pattern({
    cellSize = 25,
} ={}) {
    marginLeft = 80
    pattern = convert_pattern_text($('#input-text').val())
    const stitch_color = d3.map(pattern, d => d[0])
    const stitch_type = d3.map(pattern, d => d[1])
    const row_n = d3.map(pattern, d => d[2])
    const stitch_n = d3.map(pattern, d => d[3])
    const I = d3.range(stitch_n.length);

    const rows = d3.range(0, d3.max(row_n)+1)
    const row_idx = rows.map(row => I.filter((s, j) => row_n[j] == row))
    const row_stitch_count = row_idx.map(idx => d3.max(idx.map(i => stitch_n[i]))+1)
    // this counts increases as adding a stitch  to get the final count
    stitch_counts = new Object({'sc': 1, 'inc': 2, 'dec': 1})
    const actual_stitch_counts = row_idx.map(idx => idx.map(i => stitch_counts[stitch_type[i]]).reduce((partialSum, i) => partialSum+i, 0))

    const width = d3.max(stitch_n) * cellSize
    const height = d3.max(row_n) * cellSize
    const color = d3.scaleOrdinal(new Set(...stitch_color), d3.schemeCategory10);

    const yScale = d3.scaleBand(rows, [0, height]).padding(0)
    const xScales = row_stitch_count.map(max_stitch => d3.scaleBand(d3.range(0, max_stitch), [0, width]).padding(0))

    $('#chart').children().remove()
    const svg = d3.select('#chart')
                  .attr('width', width + marginLeft)
                  .attr('height', height)
                  .attr('viewBox', [-marginLeft, 0, width+marginLeft, height])
                  .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
                  .attr("font-family", "sans-serif")
                  .attr("font-size", 10);

    stitches = svg.append('g')
       .selectAll('rect')
       .data(I)
       .join('rect')
         .attr('height', cellSize)
         .attr('width', i => xScales[row_n[i]].bandwidth())
         .attr('fill', i => color(stitch_color[i]))
         .style('stroke', 'black')
         .attr('y', i => yScale(row_n[i]))
         .attr('x', i => xScales[row_n[i]](stitch_n[i]))
    stitches.append('title')
            .text(i => `#${stitch_n[i]+1}: ${stitch_type[i]}`)

    // horizontal lines to show decreases
    svg.append('g')
       .selectAll('line')
       .data(I)
       .join('line')
         .attr('display', i => stitch_type[i] == 'dec' ? null : 'none')
         .style('stroke', 'red')
         .attr('x1', i => xScales[row_n[i]](stitch_n[i]) + .25 * xScales[row_n[i]].bandwidth())
         .attr('x2', i => xScales[row_n[i]](stitch_n[i]) + .75 * xScales[row_n[i]].bandwidth())
         .attr('y1', i => yScale(row_n[i]) + .5 * yScale.bandwidth())
         .attr('y2', i => yScale(row_n[i]) + .5 * yScale.bandwidth())

    // vertical lines to show increases
    svg.append('g')
       .selectAll('line')
       .data(I)
       .join('line')
         .attr('display', i => stitch_type[i] == 'inc' ? null : 'none')
         .style('stroke', 'red')
         .attr('x1', i => xScales[row_n[i]](stitch_n[i]) + .5 * xScales[row_n[i]].bandwidth())
         .attr('x2', i => xScales[row_n[i]](stitch_n[i]) + .5 * xScales[row_n[i]].bandwidth())
         .attr('y1', i => yScale(row_n[i]) + .25 * yScale.bandwidth())
         .attr('y2', i => yScale(row_n[i]) + .75 * yScale.bandwidth())

    var yAxis = d3.axisLeft(yScale)
    svg.append('g')
       .call(yAxis)
       .attr("font-size", 15)
       .selectAll('text')
       .text(i => `#${i+1}: ${actual_stitch_counts[i]}`)

    return Object.assign(svg.node(), {scales: {color}});
}
