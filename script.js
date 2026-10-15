console.log("Hello World!");
//获取文件输入
const file_input = document.getElementById('midi_upload');

//声明变量
let global_midi = null;

let sky_data = [{
    "name": "null",
    "bpm": null,
    "bitsPerPage": 16,
    "songNotes": []
}];

//输出内容
function echo_html(data) {
    let para = document.createElement("p");
    let node = document.createTextNode(data);
    para.appendChild(node);
    let element = document.getElementById("div1");
    element.appendChild(para);
}

//乐谱音符转光遇音符

function piano_to_sky(note, max_octave) {
    if (!note) return null;

    let name = note.charAt(0);
    let octave_match = note.match(/\d+/);
    if (!octave_match) return null;
    let octave = parseInt(octave_match[0]);

    let isSharp = note.includes('#');
    let isFlat = note.includes('b');

    if (max_octave == '' || isNaN(max_octave)) {
        max_octave = 5;
    }

    let val = 0;
    switch (name) {
        case "C": val = 0; break;
        case "D": val = 1; break;
        case "E": val = 2; break;
        case "F": val = 3; break;
        case "G": val = 4; break;
        case "A": val = 5; break;
        case "B": val = 6; break;
        default: return null;
    }

    if (isSharp) {
        val++;
        if (val > 6) {
            val = 0;
            octave++;
        }
    }
    if (isFlat && val !== 0) {
        val--;
    }
    while (octave > max_octave || (octave == max_octave && val > 0)) {
        octave--;
    }
    
    while (octave < 3) {
        octave++;
    }

    if (octave == 3) {
        return String(val);
    } else if (octave == 4) {
        return String(val + 7);
    } else if (octave == 5 && val == 0) {
        return "14";
    }

    return null;
}



file_input.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;

    const file = e.target.files[0];
    const array_buffer = await file.arrayBuffer();
    const midi = new Midi(array_buffer);

    global_midi = midi;

    console.log("MIDI 文件名称:", midi.name);
    console.log("时长 (秒):", midi.duration);
    console.log("音轨数量:", midi.tracks.length);

    let output_div = document.getElementById("div1");
    output_div.innerHTML = "";

    echo_html("MIDI 加载成功，请选择要转换的音轨：");

    let track_select = document.createElement("select");
    track_select.id = "track_select";

    //遍历所有音轨
    global_midi.tracks.forEach((track, index) => {
        if (!track.notes || track.notes.length === 0) {
            return;
        }
        let track_option = document.createElement("option");
        track_option.value = index;
        track_option.text = track.name ? track.name : `音轨 ${index + 1}`;
        track_select.appendChild(track_option);
    });

    let track_option_all = document.createElement("option");
    track_option_all.value = "all";
    track_option_all.text = "所有音轨(合并)";
    track_select.appendChild(track_option_all);

    if (track_select.options.length === 0) {
        echo_html("该 MIDI 文件没有包含音符的音轨。");
        return;
    }

    output_div.appendChild(track_select);

    let input_max_octave = document.createElement("input");
    input_max_octave.type = "number";
    input_max_octave.placeholder = "最大八度(推荐5或4)";
    input_max_octave.style.display = "block";
    input_max_octave.id = "input_max_octave";
    output_div.appendChild(input_max_octave);
    
    let bpm = document.createElement("input");
    bpm.type = "number";
    bpm.placeholder = "播放速度（推荐450）";
    bpm.style.display = "block";
    bpm.id = "bpm";
    output_div.appendChild(bpm);
    
    let name = document.createElement("input");
    name.type = "text";
    name.placeholder = "音乐名字";
    name.style.display = "name";
    name.id = "name";
    output_div.appendChild(name);



    let start_btn = document.createElement("button");
    start_btn.innerText = "开始转换该音轨";
    start_btn.style.marginLeft = "10px";
    start_btn.onclick = process_selected_track;

    output_div.appendChild(start_btn);
});


function process_selected_track() {
    if (!global_midi) return;

    let max_octave = document.getElementById('input_max_octave').value;
    let track_select = document.getElementById("track_select");
    let track_index = track_select.value;
    let is_all = (track_index === "all");

    sky_data[0].songNotes = [];

    if (is_all) {
        sky_data[0].name = (global_midi.name || "Untitled") + "_All_Tracks";
        //遍历所有音轨
        global_midi.tracks.forEach(track => {
            //遍历该音轨中的所有音符
            track.notes.forEach(note => {
                let time_ms = (note.time * 1000).toFixed(0);
                let note_name_sky = piano_to_sky(note.name, max_octave);
                if (note_name_sky !== null) {
                    sky_data[0].songNotes.push({
                        time: time_ms,
                        key: `1Key${note_name_sky}`
                    });
                }
            });
        });
    } else {
        let current_track = global_midi.tracks[track_index];
        console.log(`正在转换音轨: ${current_track.name || track_index} ---`);

        sky_data[0].name = (global_midi.name || "Untitled") + "_Track_" + track_index;

        //遍历该音轨中的所有音符
        current_track.notes.forEach(note => {
            let time_ms = (note.time * 1000).toFixed(0);
            let note_name_sky = piano_to_sky(note.name, max_octave);
            if (note_name_sky !== null) {
                sky_data[0].songNotes.push({
                    time: time_ms,
                    key: `1Key${note_name_sky}`
                });
            }
        });
    }
    
    sky_data[0].name=document.getElementById('name').value??"null";
    sky_data[0].bpm=document.getElementById('bpm').value??"null";

    sky_data[0].songNotes.sort((a, b) => parseInt(a.time) - parseInt(b.time));

    //保存文件
    console.log("转换完成");
    console.log(sky_data);

    let json_str = JSON.stringify(sky_data, null, 2);
    let data_blob = new Blob([json_str], {
        type: 'text/plain'
    });

    saveAs(data_blob, '曲谱文件.txt');
    echo_html("已下载");
    
    echo_html(json_str);
}