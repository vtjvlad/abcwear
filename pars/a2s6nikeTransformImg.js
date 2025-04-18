const fs = require('fs');

const rawData = fs.readFileSync('../JSON/b7f7_nike_images.json', 'utf8');
const data = JSON.parse(rawData);



function transformArray(inputArray) {
  return inputArray.map(item => {
    const transformedItem = {
      url: item.url,
      imgMain: item.imgMain
    };

    if (item.imgMain && typeof item.imgs === 'object' && Object.keys(item.imgs).length > 0) {
      const imgMainParts = item.imgMain.split('/');
      const lastPart = imgMainParts[imgMainParts.length - 1].replace('.png', '');
      
      const baseUrl = 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/';
      
      transformedItem.imgs = Object.values(item.imgs).map(imgId => {
        return `${baseUrl}${imgId}/${lastPart}.png`;
      });
    } else {
      transformedItem.imgs = [];
    }

    return transformedItem;
  });
}

const result = transformArray(data);

fs.writeFileSync('../JSON/b7f7_nikeIMG.json', JSON.stringify(result, null, 2));
console.log('Done!');
