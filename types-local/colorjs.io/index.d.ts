interface Color {
  contrast(color1: string, color2: string, method: 'APCA'): number;
  contrastAPCA(color1: string, color2: string): number;
};
const colorjs: Color;
export default colorjs;
