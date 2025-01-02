<?php

class geolocCmd extends cmd
{
    public const LATITUDE_CMD_NAME = 'latitude';
    public const LONGITUDE_CMD_NAME = 'longitude';

    public static function build(eqLogic $eqLogic, string $cmdName): self
    {
        if (false === \in_array($cmdName, [self::LATITUDE_CMD_NAME, self::LONGITUDE_CMD_NAME], true)) {
            throw new \Exception('Invalid command name');
        }

        $cmd = new self();
        $cmd
            ->setEqLogic_id($eqLogic->getId())
            ->setEqType(geoloc::TYPE)
            ->setName($cmdName)
            ->setTemplate('mobile', 'default')
            ->setTemplate('dashboard', 'default')
            ->setIsHistorized(1)
            ->setType('info')
            ->setSubType('numeric')
            ->setDisplay('icon', '<i class=\"fas fa-search-location \">')
            ->setDisplay('invertBinary', 0)
            ->setIsVisible(1);
        $cmd->save();

        return $cmd;
    }
}
