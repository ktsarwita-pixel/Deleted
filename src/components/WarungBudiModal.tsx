import { useState } from 'react';
import type { PlayerState, ShopItem } from '../types/gameTypes';
import { SHOP_ITEMS } from '../game/model';
import { formatRupiah } from '../utils/formatRupiah';
import { BigBucketPixelIcon, NewShoesPixelIcon, NormalBucketPixelIcon, PortraitPixelArt, RupiahCoinIcon } from './PixelIcons';
import { Icon } from './Icon';

export function WarungBudiModal({ player, nearby, inHouse, onBuyItem, onTravel }: {
  player: PlayerState; nearby: boolean; inHouse: boolean;
  onBuyItem: (id: ShopItem['id']) => { ok: boolean; message: string }; onTravel: () => void;
}) {
  const [message, setMessage] = useState('Apa kabar, Wira? Pilih perlengkapanmu. Kita jaga hutan ini bersama.');
  const [error, setError] = useState(false);
  return <>
    <div className="shop-intro"><PortraitPixelArt portrait="budi" size={54} animated /><p aria-live="polite" className={error ? 'text-error' : ''}><strong>Pak Budi</strong>{message}</p></div>
    <div className="shop-balance"><span><RupiahCoinIcon size={24} /> Uang Wira</span><strong>{formatRupiah(player.rupiah)}</strong></div>
    {!nearby && <div className="shop-location"><p>Datang ke Warung Budi untuk membeli.</p><button className="button button-secondary" onClick={onTravel}>{inHouse ? 'Keluar rumah dahulu' : 'Menuju warung'}<Icon name="arrow" size={15} /></button></div>}
    <div className="shop-list">
      {SHOP_ITEMS.map(item => {
        const owned = item.id === 'normal_bucket' ? player.ownsNormalBucket : item.id === 'big_bucket' ? player.ownsBigBucket : player.hasNewShoes;
        const affordable = player.rupiah >= item.price;
        return <article className={`shop-item ${owned ? 'owned' : ''}`} key={item.id}>
          <div className="shop-item-art">{item.id === 'normal_bucket' ? <NormalBucketPixelIcon filled size={60} /> : item.id === 'big_bucket' ? <BigBucketPixelIcon filled size={64} /> : <NewShoesPixelIcon size={62} />}</div>
          <div className="shop-item-description"><h3>{item.name}</h3><span className="item-effect">{item.badge}</span><p>{item.description}</p></div>
          <div className="shop-item-buy"><strong>{formatRupiah(item.price)}</strong><button disabled={owned || !affordable || !nearby} className={`button ${owned ? 'button-secondary' : 'button-primary'}`} aria-label={`Beli ${item.name}`} onClick={() => {
            const result = onBuyItem(item.id); setMessage(result.message); setError(!result.ok);
          }}>{owned ? <><Icon name="check" size={15} /> Dimiliki</> : !nearby ? 'Belum di warung' : !affordable ? 'Uang kurang' : 'Beli perlengkapan'}</button></div>
        </article>;
      })}
    </div>
    <p className="shop-note"><Icon name="leaf" size={16} /> Setiap titik api yang padam memberikan bantuan Rp 6.000,00.</p>
  </>;
}