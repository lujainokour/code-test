using System;
using System.IO;
using System.Net.Sockets;
using System.Text;
public class CdpSocket : IDisposable {
    TcpClient client; NetworkStream stream;
    public CdpSocket(string address) {
        var uri=new Uri(address); client=new TcpClient(); client.Connect(uri.Host,uri.Port); stream=client.GetStream(); stream.ReadTimeout=120000;
        var key=Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var header=Encoding.ASCII.GetBytes("GET "+uri.PathAndQuery+" HTTP/1.1\r\nHost: "+uri.Authority+"\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: "+key+"\r\nSec-WebSocket-Version: 13\r\n\r\n");
        stream.Write(header,0,header.Length);
        var response=""; while(!response.EndsWith("\r\n\r\n")) response+=(char)stream.ReadByte();
        if(!response.Contains("101"))throw new Exception(response);
    }
    byte[] Read(int count) { var bytes=new byte[count]; int offset=0; while(offset<count){int n=stream.Read(bytes,offset,count-offset);if(n==0)throw new IOException("Closed");offset+=n;}return bytes; }
    public void Send(string value) {
        var bytes=Encoding.UTF8.GetBytes(value);var header=new MemoryStream();header.WriteByte(129);
        if(bytes.Length<126)header.WriteByte((byte)(128+bytes.Length));else {header.WriteByte(254);header.WriteByte((byte)(bytes.Length>>8));header.WriteByte((byte)bytes.Length);}
        var mask=Guid.NewGuid().ToByteArray();header.Write(mask,0,4);var prefix=header.ToArray();stream.Write(prefix,0,prefix.Length);
        for(int i=0;i<bytes.Length;i++)bytes[i]^=mask[i%4];stream.Write(bytes,0,bytes.Length);
    }
    public string Receive() {
        var result=new MemoryStream();bool final;
        do {var h=Read(2);final=(h[0]&128)!=0;long length=h[1]&127;
            if(length==126){var b=Read(2);length=b[0]*256+b[1];}else if(length==127){length=0;foreach(var b in Read(8))length=(length<<8)+b;}
            var mask=(h[1]&128)!=0?Read(4):null;var payload=Read((int)length);
            if(mask!=null)for(int i=0;i<payload.Length;i++)payload[i]^=mask[i%4];
            if((h[0]&15)==8)throw new IOException("WebSocket closed");result.Write(payload,0,payload.Length);
        } while(!final);
        return Encoding.UTF8.GetString(result.ToArray());
    }
    public void Dispose(){stream.Dispose();client.Close();}
}
