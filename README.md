# M4L.RhythmVAE
Max for Live(M4L) Rhythm generator using Variational Autoencoder(VAE) 


## Help me!!

I need your feedback! It takes a few minutes and it's anonymous.  
https://forms.gle/1HBhDV9k5pCKnPNE8


## How it works

[![M4L.RhythmVAE - VAE Rhythm Generator for Max for Live/Ableton Live](./images/youtube_video.png)](https://www.youtube.com/watch?v=rH7mEumq9wQ "M4L.RhythmVAE - VAE Rhythm Generator for Max for Live/Ableton Live")

If you want to quickly test the device, please use the one in `/release` directory.

![VAE Rhythm Generator in M4L(Max for Live) Device](./images/ui_memo.png)

## Requirement
- On Mac: **Ableton Live Suite for Mac 10.1.2** or later
- On Windows: Ableton Live Suite for Windows 10.1.2 **and Standalone Max 8.1.2 or later**  
On Windows, you need to set the path of external standalone Max installation on the preference panel of Ableton Live. The device is not compatible with the internal Max runtime.

## Installation

If you want to edit Max patches and export the device by yourself:

- Open `M4L.RhythmVAE/M4L.RhythmVAE.maxproj`, then open `rhythmvae.maxpat` from the project.
- When you open `rhythmvae.maxpat` for the first time, you need to press `script npm install` to install Node.js packages. 
- Every time you export the device, you have to set `Max for Live Device Type` to `MIDI` on Project Inspector (Apparently this is a bug of Max/MSP.)



## Known problems
- Incompatible with folders with names containing special characters such as `[]?*!|@`
- Changes you make on the sequence grid view are not reflected the rhythm sequence. It is just a display! 


## TO DO
- better documentation
- better UI design!!
- add a feature to add random noise to `z` 


## Updates
- 2019.3.11 added| Windows version! 
- 2019.12.27 fxied| onset/velocity/offset training data used be shuffled independently. it makes no sense! 
- 2019.11.10 added| Time shift parameter / MIDI Mapping
- 2019.10.19 fixed| beat sync issue
- 2019.10.18 added| note on the requirement
- 2019.9.14 added| functionality to save/load trained model 

## Music Examples 🎵
Here is a track I made with rhythm patterns generated by this plugin:
[https://soundcloud.com/naotokui/missions-demo](https://soundcloud.com/naotokui/missions-demo)


## MIDI Mapping

This devices considers the following 9 drum types:

  | Drum Types |
  |:-----:|
  | Kick  |
  | Snare |
  |Hi-hat closed |
  |Hi-hat open |
  |Tom low|
  |Tom mid|
  |Tom high|
  |Clap|
  |Rim|

MIDI notes in a MIDI file will be classified into the 9 Drum Types based on [General MIDI (GM) Mapping](https://www.midi.org/specifications-old/item/gm-level-1-sound-set). We have two MIDI Mapping modes and you can select one of these mappings on the device:

*Strict*

 | MIDI Note Number | Drum Type | GM Type | 
 |:-----:|:-----:|:-----:|
 | 36  |  Kick  | Acoustic Bass Drum
 | 35  |  Kick  | Bass Drum
 | 38  |  Snare  | Acoustic Snare
 | 40  |  Snare  | Electric Snare
 | 42  |  Hi-hat closed  | Closed Hihat
 | 44  |  Hi-hat open  | Pedal Hihat
 | 46  |  Hi-hat open  | Open Hihat
 | 41  |  Tom low  | Low floor Tom
 | 45  |  Tom low  | Low Tom
 | 47  |  Tom mid  | Low-mid Tom
 | 48  |  Tom mid  | High-mid Tom
 | 43  |  Tom high  | High Floor Tom
 | 50  |  Tom high  | High Tom
 | 39  |  Clap  | hand clap
 | 51  |  Rim  | Ride Symbal 1
 | 52  |  Rim  | Chinese Symbal
 | 53  |  Rim  | Ride Bell
 | 59  |  Rim  | Ride Symbal 2


*Greedy*

 | MIDI Note Number | Drum Type | 
 |:-----:|:-----:|
 | 36| Kick |
 | 35| Kick | 
  | 38| Snare | 
   | 27| Snare | 
  |  28| Snare | 
   | 31| Snare | 
  |  32| Snare | 
  |  33| Snare | 
  |  34 | Snare | 
  |  37| Snare | 
  |  39| Snare | 
  |  40| Snare | 
  |  56| Snare | 
   | 65| Snare | 
  |  66| Snare | 
  |  75| Snare | 
| 85| Snare | 
|  42| Hi-hat closed | 
|   44| Hi-hat closed | 
 | 54| Hi-hat closed | 
 | 68| Hi-hat closed | 
 | 69| Hi-hat closed | 
 | 70| Hi-hat closed | 
 | 71| Hi-hat closed | 
 | 73| Hi-hat closed | 
 | 78| Hi-hat closed | 
 | 80| Hi-hat closed | 
 | 46| Hi-hat open | 
 | 67| Hi-hat open | 
 | 72| Hi-hat open | 
 | 74| Hi-hat open | 
 | 79| Hi-hat open | 
 | 81| Hi-hat open | 
 | 45| Tom low | 
 | 29| Tom low | 
 | 41| Tom low | 
 | 61| Tom low | 
 | 64| Tom low | 
 | 84| Tom low | 
 | 48| Tom mid | 
 | 47| Tom mid | 
 | 60| Tom mid | 
 | 63| Tom mid | 
 | 77| Tom mid | 
 | 86| Tom mid | 
 | 87| Tom mid | 
 | 50| Tom high | 
 | 30| Tom high | 
 | 43| Tom high | 
 | 62| Tom high | 
 | 76| Tom high | 
 | 83| Tom high | 
 | 49|Clap | 
 | 55|Clap | 
 | 57|Clap | 
 | 58|Clap | 
 | 51| Rim |  
 | 52| Rim |  
 | 53| Rim |  
 | 59| Rim | 
 | 82| Rim |  

  (If you find these mappings are unnatual, please let me know. I'm not a drummer!) 