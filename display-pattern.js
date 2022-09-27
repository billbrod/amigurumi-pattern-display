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

function construct_color_form(uniq_colors) {
    // make sure uniq_colors is an Array, the for loop won't work if it's a set
    uniq_colors = new Array(...uniq_colors)
    color_form = d3.select('#color-form')
    // remove old pattern colors
    color_form.selectAll('label').filter('.stitch-color').remove()
    color_form.selectAll('input').filter('.stitch-color').remove()
    color_form.selectAll('br').filter('.stitch-color').remove()
    // add new colors
    for (let i in uniq_colors) {
        c = uniq_colors[i]
        color_form.append('label')
                  .attr('class', 'stitch-color')
                  .attr('for', `stitch-${c}`)
                  .text(`Stitch color ${c}:`)
        color_form.append('input')
                  .attr('class', 'stitch-color')
                  .attr('id', `stitch-${c}`)
                  .attr('name', `stitch-${c}`)
        color_form.append('br')
                  .attr('class', 'stitch-color')
    }
}

function update_colors() {
    // update colors of the different stitches
    div_line = d3.selectAll('input').filter('#cell').property('value')
    size_selector = $("input[type='radio'][name='size-selector']:checked").val()
    stitch_class = size_selector == 'spherical' ? 'path' : 'rect'
    if (div_line != '') {
        d3.selectAll(stitch_class).style('stroke', div_line)
    }
    inc_line = d3.selectAll('input').filter('#inc').property('value')
    if (inc_line != '') {
        d3.selectAll('line').filter('.inc').style('stroke', inc_line)
    }
    dec_line = d3.selectAll('input').filter('#dec').property('value')
    if (dec_line != '') {
        d3.selectAll('line').filter('.dec').style('stroke', dec_line)
    }
    stitch_inputs = d3.selectAll('input').filter('.stitch-color').each(
        function(d, i ,j) {
            // for some reason, d is undefined, so we use j[i]
            c = j[i].value
            if (c != '') {
                d3.selectAll(stitch_class).filter(`.${j[i].id}`).attr('fill', c)
            }
        }
    )
}


function display_pattern_rectangular(svg, width, height, cellSize,
                                     stitch_color, stitch_type, row_n, stitch_n, I,
                                     rows, row_idx, row_stitch_count, actual_stitch_counts,
                                     color) {

    yScale = d3.scaleBand(rows, [0, height]).padding(0)
    if (size_selector =='stretch') {
        xScales = row_stitch_count.map(max_stitch => d3.scaleBand(d3.range(0, max_stitch), [0, width]).padding(0))
    } else if (size_selector == 'row-left') {
        xScales = row_stitch_count.map(max_stitch => d3.scaleBand(d3.range(0, max_stitch), [0, (max_stitch-1) * cellSize]).padding(0))
    } else if (size_selector == 'row-ctr') {
        xScales = row_stitch_count.map(max_stitch => d3.scaleBand(d3.range(0, max_stitch),
                                                                  [width/2 - ((max_stitch-1) * cellSize)/2,
                                                                   width/2 + ((max_stitch-1) * cellSize)/2]).padding(0))
    }

    stitches = svg.append('g')
       .selectAll('rect')
       .data(I)
       .join('rect')
         .attr('class', i => `stitch-${stitch_color[i]}`)
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
         .attr('class', 'dec')
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
         .attr('class', 'inc')
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
}


function display_pattern_spherical(svg, width, height, cellSize,
                                   stitch_color, stitch_type, row_n, stitch_n, I,
                                   rows, row_idx, row_stitch_count, actual_stitch_counts,
                                   color) {
    equator = (d3.max(row_n)+1) / 2
    // we want rows to go from -80 to 80
    row_n_angle = row_n.map(d => ((d - equator) / (d3.max(row_n)+1)) * 160)
    rows_angle = rows.map(d => ((d - equator) / (d3.max(row_n)+1)) * 160)
    row_nplus1_angle = row_n.map(d => rows_angle[d+1])
    // if it was undefined, it's because it's from the last row
    row_nplus1_angle = row_nplus1_angle.map(d => d === undefined ? 80 : d)
    // we want stitches to go from -180 to 180
    stitch_n_angle = stitch_n.map((d, i) => ((d - row_stitch_count[row_n[i]] / 2) / row_stitch_count[row_n[i]]) * 360)
    stitch_nplus1_angle = stitch_n.map((d, i) => stitch_n_angle[i+1])
    // if it was undefined, it's because it's the final stitch
    stitch_nplus1_angle = stitch_nplus1_angle.map(d => d === undefined ? 180 : d)
    // -90 is the first value of a row, which should never be the second value
    // -of the polygon. that means it was the last stitch, so replace with 90
    stitch_nplus1_angle = stitch_nplus1_angle.map(d => d === -180 ? 180 : d)
    polygons = []
    for (let i in row_n) {
        polygons.push({
            type: 'Polygon',
            coordinates: [[
                [stitch_n_angle[i], row_n_angle[i]],
                [stitch_n_angle[i], row_nplus1_angle[i]],
                [stitch_nplus1_angle[i], row_nplus1_angle[i]],
                [stitch_nplus1_angle[i], row_n_angle[i]],
                [stitch_n_angle[i], row_n_angle[i]],
            ]]
        })
    }

    graticule = d3.geoGraticule().stepMinor([15, 10])()
    projection = d3.geoEqualEarth()
               .reflectY(true)
               .clipExtent([[0, 0], [width, height]])
               .rotate([0, 0])
               .translate([width / 2, height / 2])
               .precision(0.1)
    path = d3.geoPath(projection)
    svg.append("path")
       .attr("d", path(graticule))
       .attr("fill", "none")
       .attr("stroke", "currentColor")
       .attr("stroke-opacity", 0.2);
    route = {
        type: "Polygon",
        coordinates: [[
            [0,0],
            [0,-60],
            [-60,-60],
            [-60,0],
            [0,0],
        ]]
    }

    stitches = svg.append("g")
       .selectAll("path")
       .data(polygons)
       .join('path')
         .attr('stroke', 'black')
         .attr('fill', (d, i) => color(stitch_color[i]))
         .attr('d', path)
         .attr('class', (d, i) => `stitch-${stitch_color[i]}`)
    stitches.append('title')
            .text((d, i) => `${i} #${stitch_n[i]+1}: ${stitch_type[i]}`)
}


function display_pattern({
    cellSize = 25,
    add_color_form = true,
} ={}) {
    marginLeft = 80
    pattern = convert_pattern_text($('#input-text').val())
    stitch_color = d3.map(pattern, d => d[0])
    stitch_type = d3.map(pattern, d => d[1])
    row_n = d3.map(pattern, d => d[2])
    stitch_n = d3.map(pattern, d => d[3])
    I = d3.range(stitch_n.length);

    rows = d3.range(0, d3.max(row_n)+1)
    row_idx = rows.map(row => I.filter((s, j) => row_n[j] == row))
    row_stitch_count = row_idx.map(idx => d3.max(idx.map(i => stitch_n[i]))+1)
    // this counts increases as adding a stitch  to get the final count
    stitch_counts = new Object({'sc': 1, 'inc': 2, 'dec': 1})
    actual_stitch_counts = row_idx.map(idx => idx.map(i => stitch_counts[stitch_type[i]]).reduce((partialSum, i) => partialSum+i, 0))

    const width = d3.max(stitch_n) * cellSize
    const height = d3.max(row_n) * cellSize
    const uniq_colors = new Set(stitch_color)
    const color = d3.scaleOrdinal(uniq_colors, d3.schemeCategory10);
    if (add_color_form) {
        construct_color_form(uniq_colors)
    }

    $('#chart').children().remove()
    const svg = d3.select('#chart')
                  .attr('width', width + marginLeft)
                  .attr('height', height)
                  .attr('viewBox', [-marginLeft, 0, width+marginLeft, height])
                  .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
                  .attr("font-family", "sans-serif")
                  .attr("font-size", 10);
    size_selector = $("input[type='radio'][name='size-selector']:checked").val()

    if (size_selector == 'spherical') {
        display_pattern_spherical(svg, width, height, cellSize,
                                   stitch_color, stitch_type, row_n, stitch_n, I,
                                   rows, row_idx, row_stitch_count, actual_stitch_counts,
                                   color)
    } else {
        display_pattern_rectangular(svg, width, height, cellSize,
                                    stitch_color, stitch_type, row_n, stitch_n, I,
                                    rows, row_idx, row_stitch_count, actual_stitch_counts,
                                    color)
    }

    update_colors()
    return Object.assign(svg.node(), {scales: {color}});
}
