var numberofdrumButtons=document.querySelectorAll(".drum").length;

for(var i=0;i<numberofdrumButtons;i++)
{
    document.querySelectorAll(".drum")[i].addEventListener("click",function()
    {
         var item=this.innerHTML;
         console.log(this);
        makesound(item);
        buttonAnimation(item);
    });
}

document.addEventListener("keypress",function(event)
{
    makesound(event.key);
    buttonAnimation(event.key);
});


function makesound(key)
{
    switch (key) {
        case "w":
            var audio1=new Audio("sounds/crash.mp3");
            audio1.play();
            break;

        case "a":
                var audio1=new Audio("sounds/kick-bass.mp3");
                audio1.play();
                break;
        case "s":
                    var audio1=new Audio("sounds/snare.mp3");
                    audio1.play();
                    break;
    
        case "d":
                        var audio1=new Audio("sounds/tom-1.mp3");
                        audio1.play();
                        break;
        case "j":
            var audio1=new Audio("sounds/tom-2.mp3");
            audio1.play();
            break;
            
        case "k":
            var audio1=new Audio("sounds/tom-3.mp3");
            audio1.play();
            break;

        case "l":
                var audio1=new Audio("sounds/tom-4.mp3");
                audio1.play();
                break;
                    

        default:
            break;
     }
}


function buttonAnimation(currentKey)
{
    console.log(currentKey);
    
  var activateButton=document.querySelector("."+currentKey);
  activateButton.classList.add("pressed");
  setTimeout(function(){activateButton.classList.remove("pressed");
  },100);  
}