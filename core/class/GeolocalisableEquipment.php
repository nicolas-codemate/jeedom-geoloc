<?php

include('Coordinate.php');
include('CoordinateHistory.php');

final class GeolocalisableEquipment implements JsonSerializable
{
    private const OBJECT_SEPARATOR = '||';

    private $coordinate;

    /**
     * @var CoordinateHistory[]
     */
    private $coordinateHistory;
    private $eqLogic;

    private $id;
    private $name;
    private $humanName;
    private $fullHumanName;
    private $icon;

    public function __construct(eqLogic $eqLogic)
    {
        if (class_exists(jMQTT::class) && $eqLogic instanceof jMQTT && $eqLogic->getType() === jMQTTConst::TYP_BRK) {
            return;
        }

        /** @var cmd|null $cmdLatitude */
        $cmdLatitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LATITUDE_CMD_NAME);
        /** @var cmd|null $cmdLongitude */
        $cmdLongitude = cmd::byEqLogicIdCmdName($eqLogic->getId(), geolocCmd::LONGITUDE_CMD_NAME);

        $latitude = $cmdLatitude ? $cmdLatitude->execCmd() : null;
        $longitude = $cmdLongitude ? $cmdLongitude->execCmd() : null;

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $this->eqLogic = $eqLogic;
            $this->coordinate = new Coordinate((float)$latitude, (float)$longitude);
        }

        $this->id = $eqLogic->getId();
        $this->name = $eqLogic->getName();
        $this->humanName = $eqLogic->getHumanName(true, true);
        $this->fullHumanName = $this->buildFullHumanName($eqLogic);
        $this->icon = $eqLogic->getConfiguration('icone');
    }

    public function getCoordinate(): Coordinate
    {
        return $this->coordinate;
    }

    public function hasCoordinate(): bool
    {
        return null !== $this->coordinate;
    }


    public function getEqLogic(): eqLogic
    {
        return $this->eqLogic;
    }

    /**
     * @return mixed
     */
    public function getId()
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getHumanName(): string
    {
        return $this->humanName;
    }

    public function getFullHumanName(): string
    {
        return $this->fullHumanName;
    }

    /**
     * @return array|bool|mixed|string
     */
    public function getIcon()
    {
        return $this->icon;
    }

    /**
     * @return CoordinateHistory[]|null
     */
    public function getCoordinateHistory(): ?array
    {
        return $this->coordinateHistory;
    }

    public function buildCoordinateHistory(?DateTime $startDate = null, ?DateTime $endDate = null): void
    {
        /** @var cmd|null $cmdLatitude */
        $cmdLatitude = cmd::byEqLogicIdCmdName($this->eqLogic->getId(), geolocCmd::LATITUDE_CMD_NAME);
        /** @var cmd|null $cmdLongitude */
        $cmdLongitude = cmd::byEqLogicIdCmdName($this->eqLogic->getId(), geolocCmd::LONGITUDE_CMD_NAME);

        if ('1' !== $cmdLongitude->getIsHistorized() || '1' !== $cmdLatitude->getIsHistorized()) {
            return;
        }

        /** @var history[] $latitudeHistory */
        $latitudeHistory = $cmdLatitude->getHistory($startDate, $endDate);
        /** @var history[] $longitudeHistory */
        $longitudeHistory = $cmdLongitude->getHistory($startDate, $endDate);

        // ensure we got full coordinates history

        /** @var array<int, array{latitude?: float, longitude?: float}> $history */
        $history = [];
        foreach ($latitudeHistory as $historyValue) {
            /** @var string|null $latitudeDate */
            $latitudeDate = $historyValue->getDatetime();
            if (null === $latitudeDate) {
                continue;
            }

            $latitudeDate = new DateTime($latitudeDate);

            $history[$latitudeDate->getTimestamp()] = ['latitude' => $historyValue->getValue()];
        }

        /** @var CoordinateHistory[] $toReturn */
        $this->coordinateHistory = [];

        foreach ($longitudeHistory as $historyValue) {
            /** @var string|null $latitudeDate */
            $longitudeDate = $historyValue->getDatetime();
            if (null === $longitudeDate) {
                continue;
            }

            $longitudeDate = new DateTime($longitudeDate);

            if (false === \array_key_exists($longitudeDate->getTimestamp(), $history)) {
                continue; // skip if we don't have latitude for this longitude
            }

            $this->coordinateHistory[] = new CoordinateHistory(
                new Coordinate($history[$longitudeDate->getTimestamp()]['latitude'], $historyValue->getValue()),
                $longitudeDate
            );
        }
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'humanName' => $this->humanName,
            'fullHumanName' => str_replace(self::OBJECT_SEPARATOR, ' - ', $this->fullHumanName),
            'parents' => str_replace(self::OBJECT_SEPARATOR, ' - ', $this->buildParents()),
            'icon' => $this->icon,
            'latitude' => $this->coordinate ? $this->coordinate->getLatitude() : null,
            'longitude' => $this->coordinate ? $this->coordinate->getLongitude() : null,
        ];
    }

    private function buildFullHumanName(eqLogic $eqLogic): string
    {
        $object = $eqLogic->getObject();
        if (null === $object) {
            return $eqLogic->getName();
        }
        $fullHumanName = [$object->getName()];
        while ($father = $object->getFather()) {
            $fullHumanName[] = $father->getName();
            $object = $father;
        }

        $fullHumanName = array_reverse($fullHumanName);
        $fullHumanName[] = $eqLogic->getName();

        return implode(self::OBJECT_SEPARATOR, $fullHumanName);
    }

    private function buildParents(): string
    {
        $toReturn = explode(self::OBJECT_SEPARATOR, $this->fullHumanName);
        // remove last item
        array_pop($toReturn);

        return implode(self::OBJECT_SEPARATOR, $toReturn);
    }
}
