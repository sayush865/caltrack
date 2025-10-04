// Import all food images
import appleImg from '@/assets/food/apple.png';
import bananaImg from '@/assets/food/banana.png';
import orangeImg from '@/assets/food/orange.png';
import strawberryImg from '@/assets/food/strawberry.png';
import blueberryImg from '@/assets/food/blueberry.png';
import broccoliImg from '@/assets/food/broccoli.png';
import carrotImg from '@/assets/food/carrot.png';
import spinachImg from '@/assets/food/spinach.png';
import tomatoImg from '@/assets/food/tomato.png';
import cucumberImg from '@/assets/food/cucumber.png';
import chickenImg from '@/assets/food/chicken.png';
import salmonImg from '@/assets/food/salmon.png';
import eggsImg from '@/assets/food/eggs.png';
import yogurtImg from '@/assets/food/yogurt.png';
import tofuImg from '@/assets/food/tofu.png';
import riceImg from '@/assets/food/rice.png';
import quinoaImg from '@/assets/food/quinoa.png';
import oatsImg from '@/assets/food/oats.png';
import breadImg from '@/assets/food/bread.png';
import pastaImg from '@/assets/food/pasta.png';
import almondsImg from '@/assets/food/almonds.png';
import walnutsImg from '@/assets/food/walnuts.png';
import chiaImg from '@/assets/food/chia.png';
import peanutButterImg from '@/assets/food/peanut-butter.png';
import milkImg from '@/assets/food/milk.png';
import cheeseImg from '@/assets/food/cheese.png';

export const foodImageMap: Record<string, string> = {
  'Apple': appleImg,
  'Banana': bananaImg,
  'Orange': orangeImg,
  'Strawberry': strawberryImg,
  'Blueberry': blueberryImg,
  'Broccoli': broccoliImg,
  'Carrot': carrotImg,
  'Spinach': spinachImg,
  'Tomato': tomatoImg,
  'Cucumber': cucumberImg,
  'Chicken Breast': chickenImg,
  'Salmon': salmonImg,
  'Eggs': eggsImg,
  'Greek Yogurt': yogurtImg,
  'Tofu': tofuImg,
  'Brown Rice': riceImg,
  'Quinoa': quinoaImg,
  'Oats': oatsImg,
  'Whole Wheat Bread': breadImg,
  'Pasta': pastaImg,
  'Almonds': almondsImg,
  'Walnuts': walnutsImg,
  'Chia Seeds': chiaImg,
  'Peanut Butter': peanutButterImg,
  'Milk': milkImg,
  'Cheddar Cheese': cheeseImg,
};

export function getFoodImage(foodName: string): string | undefined {
  return foodImageMap[foodName];
}
